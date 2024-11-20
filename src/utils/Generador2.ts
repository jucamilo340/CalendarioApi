import * as mongoose from "mongoose";
import { MateriaModel, ProfesorModel, SalonModel } from "../modules/EventCalendar/entities/Models";
import moment from "moment-timezone";
import { convertirFormatoHorario, obtenerHorasAsignadasEnEventosSemana, obtenerHorasAsignadasPorProfesor } from "./methods";

// Definir tipos y funciones auxiliares
interface Evento {
  materia: mongoose.Types.ObjectId;
  profesor: mongoose.Types.ObjectId;
  salon: mongoose.Types.ObjectId;
  horaInicio: string;
  horaFin: string;
}

interface Individuo {
  eventos: Evento[];
}

// Función de inicialización de población
async function inicializarPoblacion(tamanoPoblacion: number, jornada:string): Promise<Individuo[]> {
  const poblacionPromesas: Individuo[] = [];
  // Lógica para generar individuos aleatorios
  for (let i = 0; i < tamanoPoblacion; i++) {
    const individuo: Individuo = {
      eventos: await generarEventosAleatoriosSemana(jornada),
    };
    poblacionPromesas.push(individuo);
  }
  const poblacionVacia = poblacionPromesas.some(poblacion => poblacion.eventos.length === 0);
  if (poblacionVacia) {
    console.log('Error al generar el calendario');
  }
  const poblacion = await Promise.all(poblacionPromesas);
  return poblacion;
}

// // Función de mutación
async function mutar(individuo: Individuo): Promise<Individuo> {
  // Lógica para introducir cambios aleatorios en el individuo
  // Ejemplo: cambiar el profesor, el salón o el horario de un evento
  // Clonar el individuo para no modificar el original directamente
  const individuoMutado: Individuo = { eventos: [...individuo.eventos] };
  // Elegir un evento aleatorio para mutar
  const indiceEventoAMutar = Math.floor(Math.random() * individuoMutado.eventos.length);
  const eventoAMutar:any = individuoMutado.eventos[indiceEventoAMutar];
  // Elegir qué atributo mutar aleatoriamente (puedes ajustar según tus necesidades)
  const atributoAMutar = Math.floor(Math.random() * 3); // 0: profesor, 1: salón, 2: horario
  const horarioC = convertirFormatoHorario({inicio:eventoAMutar.horaInicio, fin: eventoAMutar.horaFin});
  switch (atributoAMutar) {
    case 0:
      // Cambiar el profesor
      // Aquí deberías llamar a tu función para obtener un profesor disponible
      //eventoAMutar.profesor = await obtenerProfesorDisponible2( eventoAMutar.materia);
      break;
    case 1:
      // Cambiar el salón
      // Aquí deberías llamar a tu función para obtener un salón disponible
      eventoAMutar.salon = await obtenerSalonDisponible(horarioC, eventoAMutar.tipoSalon);
      break;
    case 2:
      // Cambiar el horario
      // eventoAMutar.horaInicio = generarHorarioAleatorio();
      // const duracionEvento = moment(eventoAMutar.horaFin).diff(eventoAMutar.horaInicio, 'hours');
      // eventoAMutar.horaFin = moment(eventoAMutar.horaInicio).add(duracionEvento, 'hours').format("YYYY-MM-DDTHH:mm:ssZ");
      break;
    default:
      break;
  }
  return individuoMutado;
}

function cruzar(padre1: Individuo, padre2: Individuo, puntoDeCruce: number): Individuo {
  // Lógica para combinar información de dos padres y generar descendencia
  // Punto de cruce específico
  // Asegurarse de que el punto de cruce esté dentro de los límites
  puntoDeCruce = Math.max(0, Math.min(puntoDeCruce, padre1.eventos.length - 1));
  // Crear la descendencia combinando la información de los padres en el punto de cruce
  const descendencia: Individuo = {
    eventos: [
      ...padre1.eventos.slice(0, puntoDeCruce),
      ...padre2.eventos.slice(puntoDeCruce),
    ],
  };
  // Retorna la descendencia generada
  return descendencia;
}

async function calcularAptitud(individuo: Individuo) {
  const eventosOrdenados = individuo.eventos.sort((a, b) => (a.horaInicio < b.horaInicio ? -1 : 1));
  // Penalizar cruces de horarios
  let penalizacionCruces = penalizacionarCruces(eventosOrdenados);
  // Penalizar por tipos de profesor menos utilizados
  const penalizacionTipoProfesor = await penalizarTipoProfesor(eventosOrdenados);
  // Penalizar falta de horas para las materias
  let penalizacionFaltaHoras = await penalizarFaltaHoras(individuo);
  // Retorna un valor que represente la aptitud del individuo
  return penalizacionCruces + penalizacionFaltaHoras + penalizacionTipoProfesor;
}
const penalizarFaltaHoras = async (individuo:any) => {
  let penalizacionFaltaHoras = 0;
  const materias = [...new Set(individuo.eventos.map((evento:any) => evento.materia))];
  for (const materia of materias) {
    const eventosMateria = individuo.eventos.filter((evento:any) => evento.materia === materia);
    const duracionTotalMateria = eventosMateria.reduce((total:any, evento:any) => total + evento.duracion, 0);
    const materiaS:any = await MateriaModel.findOne({_id:materia});
    const horasSemanalesMateria = materiaS.horasSemanales; 
    // Ajusta según tus necesidades
    if (duracionTotalMateria < horasSemanalesMateria) {
      penalizacionFaltaHoras += horasSemanalesMateria - duracionTotalMateria;
    }
  }
  return penalizacionFaltaHoras;
}

async function penalizarTipoProfesor(eventos: Evento[]) {
  const contadorProfesores = new Map<string, number>();
  for (const evento of eventos) {
    const profesor = await ProfesorModel.findById(evento.profesor);
    if (profesor) {
      const tipoProfesor:any = profesor.tipo;
      if (contadorProfesores.has(tipoProfesor)) {
        contadorProfesores.set(tipoProfesor, contadorProfesores.get(tipoProfesor)! + 1);
      } else {
        contadorProfesores.set(tipoProfesor, 1);
      }
    }
  }
  let penalizacionTipo = 0;
  const ordenTipos = ['contrato', 'carrera', 'catedratico'];
  for (const tipo of ordenTipos) {
    if (!contadorProfesores.has(tipo)) {
      penalizacionTipo += 1;
    }
  }

  return penalizacionTipo;
}
//Funcion para penalizar cruces
const penalizacionarCruces = (eventosOrdenados:any) => {
  let penalizacionCruces = 0;
  for (let i = 0; i < eventosOrdenados.length - 1; i++) {
    if (eventosOrdenados[i].horaFin > eventosOrdenados[i + 1].horaInicio) {
      penalizacionCruces++;
    }
  }
  return penalizacionCruces;
}
//Algoritmo genético principal
export async function algoritmoGenetico(tamanoPoblacion: number, numGeneraciones: number, grupo:any) {
  let poblacion:any = await inicializarPoblacion(tamanoPoblacion, grupo);
  for (let generacion = 0; generacion < numGeneraciones; generacion++) {
    poblacion = await Promise.all(poblacion.map(async (individuo:any) => {
      return {individuo, aptitud: await calcularAptitud(individuo)}
  }));
    poblacion.sort((a:any, b:any) => a.aptitud - b.aptitud);
    const padresSeleccionados = poblacion.slice(0, tamanoPoblacion / 2);
    const puntoDeCruceEjemplo = 3;
    const descendencia = padresSeleccionados.map((padre:any, index:any) =>
      cruzar(padre.individuo, padresSeleccionados[index % padresSeleccionados.length].individuo, puntoDeCruceEjemplo)
    );
    poblacion = [...padresSeleccionados.map((padre:any) => padre.individuo), ...await Promise.all(descendencia.map(mutar))];
  }
  return poblacion[0].eventos;
}

// Función para generar eventos aleatorios con restricciones para toda la semana
export async function generarEventosAleatoriosSemana(grupo: any) {
  const eventosSemana: Evento[] = [];
  const jornada = grupo.diurno ? 'diurna' : 'nocturna';
  const materias = await MateriaModel.find({nivel: grupo.semestre});

  for (const materiaAleatoria of materias) {
    const profesoresDisponibles = await obtenerProfesorDisponible2(materiaAleatoria._id);
    let profesorP = null;
    let horasSemanalesMateria = materiaAleatoria.horasSemanales;

    for (const profesor of profesoresDisponibles) {
      const horasAsignadas = await obtenerHorasAsignadasPorProfesor(profesor?._id);
      const eventosSemanaHoras = obtenerHorasAsignadasEnEventosSemana(profesor._id, eventosSemana);
      if (horasAsignadas + eventosSemanaHoras < 16) {
        profesorP = profesor;
        break;
      } else {
        continue;
      }
    }

    for (let i = 0; i < materiaAleatoria.sesiones; i++) {
      let profesorAsignado = null;
      let salonDisponible = null;
      let horaInicio;
      let horaFin;
      let horarioC;
      let duracionEvento: number = Math.floor(horasSemanalesMateria / (materiaAleatoria.sesiones - i));
      horasSemanalesMateria -= duracionEvento;

      // Generar el horario para el evento
      horaInicio = generarHorarioAleatorio(duracionEvento, jornada);
      horaFin = moment(horaInicio).add(duracionEvento, 'hours').format("YYYY-MM-DDTHH:mm:ssZ");
      horarioC = convertirFormatoHorario({inicio: horaInicio, fin: horaFin});

      // Intentar asignar profesor si hay alguno disponible
      if (profesorP) {
        profesorAsignado = await obtenerProfesorAsignado(profesorP?._id, horarioC);
      }

      // Intentar asignar salón si hay alguno disponible
      salonDisponible = await obtenerSalonDisponible(horarioC, materiaAleatoria.tipoSalon);

      const evento: any = {
        materia: materiaAleatoria,
        profesor: profesorAsignado || null,
        salon: salonDisponible?._id || null,
        horaInicio: horaInicio,
        horaFin: horaFin,
        materiaNombre: materiaAleatoria.nombre,
        tipoSalon: materiaAleatoria.tipoSalon,
        idHorario: materiaAleatoria?._id + ':' + (profesorAsignado?._id || 'null')
      };

      eventosSemana.push(evento);
    }
  }
  return eventosSemana;
}

// Función para generar un horario aleatorio entre las 7 am y las 10 pm
function generarHorarioAleatorio(duracion:any, tipo:any) {
  const fechaInicial = moment('2018-01-08');
  const fechaFinal = moment('2018-01-12');
  let horarioAleatorio;
  do {
    // Elige un día aleatorio entre la fechaInicial y fechaFinal
    const diaAleatorio = Math.floor(Math.random() * (fechaFinal.diff(fechaInicial, 'days') + 1));
    // Establece la fecha elegida
    const fechaElegida = fechaInicial.clone().add(diaAleatorio, 'days');
    // Genera una hora aleatoria según el tipo
    let horaAleatoria:any;
    if (tipo === 'diurna') {
      horaAleatoria = Math.floor(Math.random() * 11) + 7; 
    } else if (tipo === 'nocturna') {
      horaAleatoria = Math.floor(Math.random() * 5) + 18;
    } else if (tipo === 'mixta') {
      horaAleatoria = Math.floor(Math.random() * 15) + 7;
    }
    // Establece la hora en punto
    fechaElegida.set('hour', horaAleatoria);
    fechaElegida.set('minute', 0);
    const horaFin = moment(fechaElegida).add(duracion, 'hours');
    if (
      (tipo === 'diurna' && horaFin.isBefore(moment('18:00', 'HH:mm'))) ||
      (tipo === 'nocturna' && horaFin.isBefore(moment('22:00', 'HH:mm'))) ||
      (tipo === 'mixta' && horaFin.isBefore(moment('22:00', 'HH:mm')))
    ) {
      horarioAleatorio = fechaElegida.format();
    }
  } while (!horarioAleatorio);
  return horarioAleatorio;
}


async function obtenerProfesorDisponible2(materia: string) {
  const filter: any = {};
  filter.materias = materia;
  const profesoresDisponibles = await ProfesorModel.find(filter);
  if (profesoresDisponibles.length === 0) {
    return [];
  }
  profesoresDisponibles.sort((a:any, b:any) => {
    const tipoPrioritario = ['contrato', 'carrera', 'invitado'];
    const indexA = tipoPrioritario.indexOf(a.tipo);
    const indexB = tipoPrioritario.indexOf(b.tipo);
    return indexA - indexB;
  });

  return profesoresDisponibles;
}

async function obtenerProfesorAsignado(profesorId: string, horarioC: any) {
  const filter: any = {
    _id: profesorId,
    ocupacion: {
      $not: {
        $elemMatch: {
          dia: horarioC.dia,
          inicio: { $lt: horarioC.fin },
          fin: { $gt: horarioC.inicio }
        }
      }
    }
  };
  const profesorAsignado = await ProfesorModel.findOne(filter).exec();
  return profesorAsignado;
}

// Función para obtener un profesor disponible aleatorio
async function obtenerProfesorDisponible(horarioC: any, materia: string) {
  const filter: any = {};
  filter.materias = materia;
  filter.ocupacion = {
    $not: {
      $elemMatch: {
        dia: horarioC.dia,
        inicio: { $lt: horarioC.fin },
        fin: { $gt: horarioC.inicio }
      }
    }
  }
  // Obtener todos los profesores que cumplen con los criterios
  const profesoresDisponibles = await ProfesorModel.find(filter).exec();
  if (profesoresDisponibles.length === 0) {
    // No hay profesores disponibles
    return null;
  }
  // Seleccionar aleatoriamente un profesor de la lista
  const profesorSeleccionado = profesoresDisponibles[Math.floor(Math.random() * profesoresDisponibles.length)];
  return profesorSeleccionado;
}
// Función para obtener un salón disponible aleatorio
async function obtenerSalonDisponible(horarioC: any, tipoSalon: string) {
  const filter: any = {
    tipo: tipoSalon,
    ocupacion: {
      $not: {
        $elemMatch: {
          dia: horarioC.dia,
          inicio: { $lt: horarioC.fin },
          fin: { $gt: horarioC.inicio },
        },
      },
    },
  };

  // Obtener todos los salones que cumplen con el filtro
  const salonesDisponibles = await SalonModel.find(filter).exec();

  if (salonesDisponibles.length === 0) {
    return null; // No hay salones disponibles
  }

  // Seleccionar un salón al azar entre los disponibles
  const indiceAleatorio = Math.floor(Math.random() * salonesDisponibles.length);
  const salonSeleccionado = salonesDisponibles[indiceAleatorio];

  return salonSeleccionado;
}


export const crearEventos = async (grupo:any) => {
  const eventosGenerados = await algoritmoGenetico(100, 500, grupo);
  return eventosGenerados;
}