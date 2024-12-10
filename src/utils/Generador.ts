// @ts-nocheck
import * as mongoose from "mongoose";
import {
 MateriaModel,
 ProfesorModel,
 SalonModel,
 EventCalendarModel,
 AsignacionModel,
} from "../modules/EventCalendar/entities/Models";
import moment from "moment-timezone";
import {
 convertirFormatoHorario,
 obtenerHorasAsignadasEnEventosSemana,
 obtenerHorasAsignadasPorProfesor,
} from "./methods";


// Definir tipos y funciones auxiliares
interface Evento {
 materia: any; // Ajusta el tipo según tu modelo de Materia
 profesor: any; // Ajusta el tipo según tu modelo de Profesor
 salon: mongoose.Types.ObjectId | null;
 horaInicio: string;
 horaFin: string;
 idHorario: string;
}


interface Individuo {
 eventos: Evento[];
 aptitud?: number;
}


// Función de inicialización de población
async function inicializarPoblacion(
 tamanoPoblacion: number,
 grupo: any
): Promise<Individuo[]> {
 const poblacion: Individuo[] = [];


 for (let i = 0; i < tamanoPoblacion; i++) {
   const eventos = await generarEventosAleatoriosSemana(grupo);
   if (eventos.length === 0) {
     throw new Error("Error al generar el calendario: población vacía.");
   }
   poblacion.push({ eventos });
 }


 return poblacion;
}


// Función de mutación mejorada
async function mutar(individuo: Individuo, grupo: any): Promise<Individuo> {
 const individuoMutado: Individuo = { eventos: [...individuo.eventos] };


 // Elegir un evento aleatorio para mutar
 const indiceEventoAMutar = Math.floor(
   Math.random() * individuoMutado.eventos.length
 );
 const eventoAMutar: any = {
   ...individuoMutado.eventos[indiceEventoAMutar],
 };


 // Elegir qué atributo mutar aleatoriamente
 const atributoAMutar = Math.floor(Math.random() * 3); // 0: profesor, 1: salón, 2: horario


 switch (atributoAMutar) {
   case 0:
     // Cambiar el profesor
     const profesoresDisponibles = await obtenerProfesorDisponible2(
       eventoAMutar.materia._id
     );
     if (profesoresDisponibles.length > 0) {
       for (const profesor of profesoresDisponibles) {
         if (
           profesorEstaDisponible(
             individuoMutado.eventos.filter(
               (e) => !e.profesor._id.equals(profesor._id)
             ),
             convertirFormatoHorario({
               inicio: eventoAMutar.horaInicio,
               fin: eventoAMutar.horaFin,
             }),
             profesor._id
           )
         ) {
           eventoAMutar.profesor = profesor;
           break;
         }
       }
     }
     break;
   case 1:
     // Cambiar el salón
     {
       const horarioC = convertirFormatoHorario({
         inicio: eventoAMutar.horaInicio,
         fin: eventoAMutar.horaFin,
       });
       const salonDisponible = await obtenerSalonDisponible(
         horarioC,
         eventoAMutar.materia.tipoSalon,
         individuoMutado.eventos
       );
       eventoAMutar.salon = salonDisponible ? salonDisponible._id : null;
     }
     break;
   case 2:
     // Cambiar el horario
     {
       const duracionEvento = moment(eventoAMutar.horaFin).diff(
         eventoAMutar.horaInicio,
         "hours"
       );


       // Generar una lista de horarios posibles
       const posiblesHorarios = generarListaHorariosPosibles(
         duracionEvento,
         grupo.diurno ? "diurna" : "nocturna"
       );


       let intento = 0;
       let conflicto = false;
       do {
         const horarioSeleccionado =
           posiblesHorarios[intento % posiblesHorarios.length];
         const diaSeleccionado = horarioSeleccionado.dia;
         eventoAMutar.horaInicio = horarioSeleccionado.inicio;
         eventoAMutar.horaFin = horarioSeleccionado.fin;


         const horarioC = convertirFormatoHorario({
           inicio: eventoAMutar.horaInicio,
           fin: eventoAMutar.horaFin,
         });


         conflicto = existeConflictoHorario(
           individuoMutado.eventos,
           horarioC,
           eventoAMutar.profesor?._id,
           eventoAMutar.salon
         );


         intento++;
       } while (conflicto && intento < posiblesHorarios.length);
     }
     break;
   default:
     break;
 }


 // Reemplazar el evento mutado en el individuo
 individuoMutado.eventos[indiceEventoAMutar] = eventoAMutar;


 return individuoMutado;
}


// Función de cruce mejorada (Order Crossover)
function cruzar(padre1: Individuo, padre2: Individuo): Individuo {
  const hijoEventos: Evento[] = [];
  const materiasIncluidas = new Set<string>();

  // Agregar eventos del primer padre
  padre1.eventos.forEach((evento) => {
    hijoEventos.push(evento);
    materiasIncluidas.add(evento.materia._id.toString());
  });

  // Agregar eventos del segundo padre que no estén ya incluidos
  padre2.eventos.forEach((evento) => {
    const materiaId = evento.materia._id.toString();
    if (!materiasIncluidas.has(materiaId)) {
      hijoEventos.push(evento);
      materiasIncluidas.add(materiaId);
    }
  });

  return { eventos: hijoEventos };
}



// Función para penalizar falta de separación entre eventos del mismo profesor
async function penalizarSeparacionProfesor(eventos: Evento[]) {
 let penalizacion = 0;
 const minSeparacionHoras = 4; // Puedes ajustar este valor según tus necesidades


 // Agrupar eventos por profesor
 const eventosPorProfesor = eventos.reduce((acc: any, evento) => {
   if (evento.profesor) {
     const profesorId = evento.profesor._id.toString();
     if (!acc[profesorId]) {
       acc[profesorId] = [];
     }
     acc[profesorId].push(evento);
   }
   return acc;
 }, {});


 // Calcular penalización para cada profesor
 for (const profesorId in eventosPorProfesor) {
   const eventosProfesor = eventosPorProfesor[profesorId];


   // Ordenar eventos del profesor por hora de inicio
   eventosProfesor.sort((a: Evento, b: Evento) =>
     a.horaInicio < b.horaInicio ? -1 : 1
   );


   // Calcular penalización por cercanía entre eventos
   for (let i = 0; i < eventosProfesor.length - 1; i++) {
     const eventoActual = eventosProfesor[i];
     const eventoSiguiente = eventosProfesor[i + 1];


     const horaFinActual = moment(eventoActual.horaFin);
     const horaInicioSiguiente = moment(eventoSiguiente.horaInicio);


     const diferenciaHoras = horaInicioSiguiente.diff(horaFinActual, "hours");


     if (diferenciaHoras < minSeparacionHoras) {
       penalizacion += minSeparacionHoras - diferenciaHoras;
     }
   }
 }


 return penalizacion;
}


// Función de aptitud mejorada (también usada como costo)
async function calcularCosto(individuo: Individuo): Promise<number> {
 const eventosOrdenados = [...individuo.eventos].sort((a, b) =>
   a.horaInicio < b.horaInicio ? -1 : 1
 );


 const penalizacionCruces = penalizarCruces(eventosOrdenados);
 const penalizacionTipoProfesor = await penalizarTipoProfesor(eventosOrdenados);
 const penalizacionFaltaHoras = await penalizarFaltaHoras(individuo);
 const penalizacionProfesoresSinAsignar = eventosOrdenados.filter(
   (evento) => !evento.profesor
 ).length;
 const penalizacionSalonesSinAsignar = eventosOrdenados.filter(
   (evento) => !evento.salon
 ).length;
 const penalizacionSeparacionProfesor = await penalizarSeparacionProfesor(
   eventosOrdenados
 );


 // Ajustar pesos según la importancia de cada criterio
 const costo =
   penalizacionCruces * 5 +
   penalizacionFaltaHoras * 3 +
   penalizacionTipoProfesor * 2 +
   penalizacionProfesoresSinAsignar * 10 +
   penalizacionSalonesSinAsignar * 10 +
   penalizacionSeparacionProfesor * 4; // Ajusta el peso según tus necesidades


 individuo.aptitud = costo;
 return costo;
}


// Función para penalizar falta de horas en las materias
const penalizarFaltaHoras = async (individuo: Individuo) => {
 let penalizacionFaltaHoras = 0;
 const materias = [
   ...new Set(individuo.eventos.map((evento) => evento.materia._id)),
 ];
 for (const materiaId of materias) {
   const eventosMateria = individuo.eventos.filter((evento) =>
     evento.materia._id.equals(materiaId)
   );
   const duracionTotalMateria = eventosMateria.reduce((total, evento) => {
     const duracion = moment(evento.horaFin).diff(evento.horaInicio, "hours");
     return total + duracion;
   }, 0);
   const materia: any = await MateriaModel.findById(materiaId);
   const horasSemanalesMateria = materia.horasSemanales;
   if (duracionTotalMateria < horasSemanalesMateria) {
     penalizacionFaltaHoras += horasSemanalesMateria - duracionTotalMateria;
   }
 }
 return penalizacionFaltaHoras;
};


// Función para penalizar tipos de profesor menos utilizados
async function penalizarTipoProfesor(eventos: Evento[]) {
 const contadorProfesores = new Map<string, number>();
 for (const evento of eventos) {
   const profesor = await ProfesorModel.findById(evento.profesor);
   if (profesor) {
     const tipoProfesor: any = profesor.tipo;
     if (contadorProfesores.has(tipoProfesor)) {
       contadorProfesores.set(
         tipoProfesor,
         contadorProfesores.get(tipoProfesor)! + 1
       );
     } else {
       contadorProfesores.set(tipoProfesor, 1);
     }
   }
 }
 let penalizacionTipo = 0;
 const ordenTipos = ["contrato", "carrera", "catedratico"];
 for (const tipo of ordenTipos) {
   if (!contadorProfesores.has(tipo)) {
     penalizacionTipo += 1;
   }
 }


 return penalizacionTipo;
}


// Función para penalizar cruces de horarios
function penalizarCruces(eventos: Evento[]) {
 let penalizacion = 0;


 for (let i = 0; i < eventos.length - 1; i++) {
   for (let j = i + 1; j < eventos.length; j++) {
     if (
       eventos[i].horaInicio < eventos[j].horaFin &&
       eventos[i].horaFin > eventos[j].horaInicio &&
       eventos[i].horaInicio.slice(0, 10) === eventos[j].horaInicio.slice(0, 10)
     ) {
       // Siempre hay conflicto en el mismo grupo
       penalizacion++;
       // Verificar si comparten el mismo profesor o salón
       if (
         eventos[i].profesor &&
         eventos[j].profesor &&
         eventos[i].profesor.equals(eventos[j].profesor)
       ) {
         penalizacion++;
       }
       if (
         eventos[i].salon &&
         eventos[j].salon &&
         eventos[i].salon === eventos[j].salon
       ) {
         penalizacion++;
       }
     }
   }
 }


 return penalizacion;
}


// Algoritmo genético principal con elitismo y selección por torneo
export async function algoritmoGenetico(
 tamanoPoblacion: number,
 numGeneraciones: number,
 grupo: any
) {
 let poblacion = await inicializarPoblacion(tamanoPoblacion, grupo);


 for (let generacion = 0; generacion < numGeneraciones; generacion++) {
   // Calcular aptitud de la población
   await Promise.all(
     poblacion.map(async (individuo) => {
       if (individuo.aptitud === undefined) {
         await calcularCosto(individuo);
       }
     })
   );
   // Ordenar población por aptitud
   poblacion.sort((a, b) => a.aptitud! - b.aptitud!);


   // Preservar los mejores individuos (elitismo)
   const elite = poblacion.slice(0, Math.floor(tamanoPoblacion * 0.1));

   // Selección por torneo
   const padres: Individuo[] = [];
   while (padres.length < tamanoPoblacion / 2) {
     const candidato1 =
       poblacion[Math.floor(Math.random() * poblacion.length)];
     const candidato2 =
       poblacion[Math.floor(Math.random() * poblacion.length)];
     padres.push(
       candidato1.aptitud! < candidato2.aptitud! ? candidato1 : candidato2
     );
   }


   // Generar descendencia
   const descendencia: Individuo[] = [];
   for (let i = 0; i < padres.length; i += 2) {
     const padre1 = padres[i];
     const padre2 = padres[i + 1] || padres[0]; // En caso de número impar
     let hijo = cruzar(padre1, padre2);
     hijo = await mutar(hijo, grupo);
     descendencia.push(hijo);
   }


   // Nueva población
   poblacion = [...elite, ...descendencia];


   // Limitar población al tamaño máximo
   poblacion = poblacion.slice(0, tamanoPoblacion);
 }


 // Ordenar población final y retornar el mejor individuo
 poblacion.sort((a, b) => a.aptitud! - b.aptitud!);
 return poblacion[0].eventos;
}


// Función para generar eventos aleatorios con restricciones para toda la semana
export async function generarEventosAleatoriosSemana(grupo: any) {
 const eventosSemana: Evento[] = [];
 const jornada = grupo.diurno ? "diurna" : "nocturna";


 // Filtrar materias por nivel y plan del grupo
 const asignaciones = await AsignacionModel.find({ grupo: grupo._id }).populate('materia');

 if (asignaciones.length === 0) {
   throw new Error(`No se encontraron asignaciones para el grupo ${grupo.nombre}`);
 }

 const materias = asignaciones.map(asignacion => asignacion?.materia);
 if (materias.length === 0) {
  throw new Error(`No se encontraron asignaciones para el grupo ${grupo.nombre}`);
}

 // Verificar si se encontraron materias
 if (materias.length === 0) {
   throw new Error(
     `No se encontraron materias para el nivel ${grupo.semestre} y plan ${grupo.plan}`
   );
 }


 // Crear un arreglo de días de la semana
 const diasSemana = [
   "2018-01-08",
   "2018-01-09",
   "2018-01-10",
   "2018-01-11",
   "2018-01-12",
 ];


 for (const materia of materias) {
   const profesoresDisponibles = await obtenerProfesorDisponible(materia._id, grupo._id);
   let profesorAsignado =
     profesoresDisponibles.length > 0 ? profesoresDisponibles[0] : null;


   const duracionEvento = Math.floor(materia.horasSemanales / materia.sesiones);


   // Generar una lista de horarios posibles
   const posiblesHorarios = generarListaHorariosPosibles(
     duracionEvento,
     jornada
   );


   let sesionesAsignadas = 0;
   let indiceHorario = 0;

   while (sesionesAsignadas < materia.sesiones) {
     if (indiceHorario >= posiblesHorarios.length) {
       throw new Error(
         `No se pudo asignar un horario para la materia ${materia.nombre}`
       );
     }


     const horarioSeleccionado = posiblesHorarios[indiceHorario];
     const horaInicio = horarioSeleccionado.inicio;
     const horaFin = horarioSeleccionado.fin;
     const horarioC = convertirFormatoHorario({ inicio: horaInicio, fin: horaFin });


     // Verificar conflictos
     const conflicto = existeConflictoHorario(
       eventosSemana,
       horarioC,
       profesorAsignado?._id
     );


     if (!conflicto) {
       // Verificar disponibilidad del salón
       const salonDisponible = await obtenerSalonDisponible(
         horarioC,
         materia.tipoSalon,
         eventosSemana
       );


       if (salonDisponible) {
         const evento: Evento = {
           materia: materia,
           profesor: profesorAsignado,
           salon: salonDisponible._id,
           horaInicio: horaInicio,
           horaFin: horaFin,
           idHorario: materia?._id + (profesorAsignado?._id || profesorAsignado) + grupo._id,
         };
         eventosSemana.push(evento);
         sesionesAsignadas++;
       }
     }


     indiceHorario++;
   }
 }
 return eventosSemana;
}


// Función para generar una lista de horarios posibles
function generarListaHorariosPosibles(duracion: number, tipo: string) {
 const horariosPosibles: { dia: string; inicio: string; fin: string }[] = [];
 const diasSemana = [
   "2018-01-08",
   "2018-01-09",
   "2018-01-10",
   "2018-01-11",
   "2018-01-12",
 ];


 for (const dia of diasSemana) {
   const fechaBase = moment(dia);


   let horasInicio: number[] = [];
   if (tipo === "diurna") {
     horasInicio = Array.from({ length: 11 }, (_, i) => i + 7); // Horas de 7 a 17
   } else if (tipo === "nocturna") {
     horasInicio = Array.from({ length: 5 }, (_, i) => i + 18); // Horas de 18 a 22
   } else if (tipo === "mixta") {
     horasInicio = Array.from({ length: 15 }, (_, i) => i + 7); // Horas de 7 a 21
   }


   for (const hora of horasInicio) {
     const inicio = fechaBase.clone().set("hour", hora).set("minute", 0);
     const fin = inicio.clone().add(duracion, "hours");


     if (
       (tipo === "diurna" && fin.hour() <= 18) ||
       (tipo === "nocturna" && fin.hour() <= 22) ||
       (tipo === "mixta" && fin.hour() <= 22)
     ) {
       horariosPosibles.push({
         dia: dia,
         inicio: inicio.format("YYYY-MM-DDTHH:mm:ssZ"),
         fin: fin.format("YYYY-MM-DDTHH:mm:ssZ"),
       });
     }
   }
 }


 // Mezclar los horarios para variar las opciones
 shuffleArray(horariosPosibles);


 return horariosPosibles;
}


// Función para mezclar un arreglo (shuffle)
function shuffleArray(array: any[]) {
 for (let i = array.length - 1; i > 0; i--) {
   const j = Math.floor(Math.random() * (i + 1));
   [array[i], array[j]] = [array[j], array[i]];
 }
}


// Función para verificar conflictos de horario
function existeConflictoHorario(
 eventos: Evento[],
 horarioC: any,
 profesorId?: mongoose.Types.ObjectId,
 salonId?: mongoose.Types.ObjectId
) {
 return eventos.some((evento) => {
   const eventoHorario = convertirFormatoHorario({
     inicio: evento.horaInicio,
     fin: evento.horaFin,
   });


   const solapamiento =
     eventoHorario.dia === horarioC.dia &&
     eventoHorario.inicio < horarioC.fin &&
     eventoHorario.fin > horarioC.inicio;


   const conflictoProfesor =
     profesorId && evento.profesor
       ? evento.profesor._id.equals(profesorId)
       : false;


   const conflictoSalon =
     salonId && evento.salon ? evento.salon.equals(salonId) : false;


   // Siempre hay conflicto en el mismo grupo si hay solapamiento
   return solapamiento && (conflictoProfesor || conflictoSalon || true);
 });
}


// Función para verificar disponibilidad del profesor
function profesorEstaDisponible(
 eventos: Evento[],
 horarioC: any,
 profesorId: mongoose.Types.ObjectId
) {
 return !eventos.some((evento) => {
   if (!evento.profesor || !evento.profesor._id.equals(profesorId)) {
     return false;
   }
   const eventoHorario = convertirFormatoHorario({
     inicio: evento.horaInicio,
     fin: evento.horaFin,
   });
   const solapamiento =
     eventoHorario.dia === horarioC.dia &&
     eventoHorario.inicio < horarioC.fin &&
     eventoHorario.fin > horarioC.inicio;
   return solapamiento;
 });
}


// Función para obtener profesores disponibles ordenados por prioridad
async function obtenerProfesorDisponible2(materia: string) {
 const filter: any = {};
 filter.materias = materia;
 const profesoresDisponibles = await ProfesorModel.find(filter);
 if (profesoresDisponibles.length === 0) {
   return [];
 }
 profesoresDisponibles.sort((a: any, b: any) => {
   const tipoPrioritario = ["contrato", "carrera", "invitado"];
   const indexA = tipoPrioritario.indexOf(a.tipo);
   const indexB = tipoPrioritario.indexOf(b.tipo);
   return indexA - indexB;
 });


 return profesoresDisponibles;
}

async function obtenerProfesorDisponible(materiaId: string, grupoId: string) {
  // Busca en la colección de asignaciones
  const asignacion = await AsignacionModel.findOne({
    materia: materiaId,
    grupo: grupoId,
  }).populate("profesor"); // Usamos populate para traer los datos del profesor

  if (!asignacion || !asignacion?.profesor) {
    // Si no se encuentra asignación o no hay profesor, retornamos un arreglo vacío
    return [];
  }

  // Devuelve el profesor asignado
  return [asignacion.profesor];
}


// Función para obtener un salón disponible
async function obtenerSalonDisponible(
  horarioC: any,
  tipoSalon: string,
  eventos: Evento[]
) {
  // Obtener salones y mezclarlos aleatoriamente
  const salones = await SalonModel.find({ tipo: tipoSalon });
  const salonesMezclados = salones.sort(() => Math.random() - 0.5);

  for (const salon of salonesMezclados) {
    const disponible = !eventos.some((evento) => {
      if (!evento.salon || !evento.salon.equals(salon._id)) {
        return false;
      }
      const eventoHorario = convertirFormatoHorario({
        inicio: evento.horaInicio,
        fin: evento.horaFin,
      });
      const solapamiento =
        eventoHorario.dia === horarioC.dia &&
        eventoHorario.inicio < horarioC.fin &&
        eventoHorario.fin > horarioC.inicio;
      return solapamiento;
    });
    if (disponible) {
      return salon;
    }
  }
  return null;
}


// Implementación de Simulated Annealing
export async function simulatedAnnealing(
 individuoInicial: Individuo,
 grupo: any,
 temperaturaInicial: number,
 temperaturaFinal: number,
 tasaEnfriamiento: number,
 iteracionesPorTemperatura: number
): Promise<Individuo> {
 let temperatura = temperaturaInicial;
 let individuoActual = { ...individuoInicial };
 let costoActual = await calcularCosto(individuoActual);
 let mejorIndividuo = { ...individuoActual };
 let mejorCosto = costoActual;


 while (temperatura > temperaturaFinal) {
   for (let i = 0; i < iteracionesPorTemperatura; i++) {
     const vecino = await mutar(individuoActual, grupo);
     const costoVecino = await calcularCosto(vecino);


     const deltaCosto = costoVecino - costoActual;


     if (deltaCosto < 0) {
       // El vecino es mejor, lo aceptamos
       individuoActual = vecino;
       costoActual = costoVecino;


       // Actualizamos el mejor individuo encontrado
       if (costoVecino < mejorCosto) {
         mejorIndividuo = vecino;
         mejorCosto = costoVecino;
       }
     } else {
       // El vecino es peor, lo aceptamos con cierta probabilidad
       const probabilidad = Math.exp(-deltaCosto / temperatura);
       if (Math.random() < probabilidad) {
         individuoActual = vecino;
         costoActual = costoVecino;
       }
     }
   }


   // Enfriamiento
   temperatura *= tasaEnfriamiento;
 }


 return mejorIndividuo;
}


// Función para crear los eventos utilizando el algoritmo genético y Simulated Annealing
export const crearEventos = async (grupo: any) => {
 // Ejecutamos el algoritmo genético
 const mejorIndividuoGeneticoEventos = await algoritmoGenetico(50, 100, grupo);


 // Creamos el individuo inicial para Simulated Annealing
 const individuoInicial: Individuo = { eventos: mejorIndividuoGeneticoEventos };

 // Parámetros de Simulated Annealing
 const temperaturaInicial = 1000;
 const temperaturaFinal = 0.01;
 const tasaEnfriamiento = 0.9;
 const iteracionesPorTemperatura = 100;


 // Ejecutamos Simulated Annealing
 const mejorIndividuo = await simulatedAnnealing(
   individuoInicial,
   grupo,
   temperaturaInicial,
   temperaturaFinal,
   tasaEnfriamiento,
   iteracionesPorTemperatura
 );


 return mejorIndividuo.eventos;
};
