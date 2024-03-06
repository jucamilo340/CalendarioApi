import * as mongoose from "mongoose";
import { MateriaModel, ProfesorModel, SalonModel } from "../modules/EventCalendar/entities/Models";
import moment from "moment-timezone";
import { convertirFormatoHorario } from "./methods";

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
async function inicializarPoblacion(tamanoPoblacion: number, jornada:string): Individuo[] {
  const poblacionPromesas: Individuo[] = [];
  // Lógica para generar individuos aleatorios
  for (let i = 0; i < tamanoPoblacion; i++) {
    const individuo: Individuo = {
      eventos: await generarEventosAleatoriosSemana(jornada),
    };
    poblacionPromesas.push(individuo);
  }
  const poblacion = await Promise.all(poblacionPromesas);
  return poblacion;
}

// // Función de mutación
async function mutar(individuo: Individuo): Individuo {
  // Lógica para introducir cambios aleatorios en el individuo
  // Ejemplo: cambiar el profesor, el salón o el horario de un evento
  // Clonar el individuo para no modificar el original directamente
  const individuoMutado: Individuo = { eventos: [...individuo.eventos] };
  // Elegir un evento aleatorio para mutar
  const indiceEventoAMutar = Math.floor(Math.random() * individuoMutado.eventos.length);
  const eventoAMutar = individuoMutado.eventos[indiceEventoAMutar];
  // Elegir qué atributo mutar aleatoriamente (puedes ajustar según tus necesidades)
  const atributoAMutar = Math.floor(Math.random() * 3); // 0: profesor, 1: salón, 2: horario
  const horarioC = convertirFormatoHorario({inicio:eventoAMutar.horaInicio, fin: eventoAMutar.horaFin});

  switch (atributoAMutar) {
    case 0:
      // Cambiar el profesor
      // Aquí deberías llamar a tu función para obtener un profesor disponible
      //eventoAMutar.profesor = await obtenerProfesorDisponible(horarioC, eventoAMutar.materia);
      break;
    case 1:
      // Cambiar el salón
      // Aquí deberías llamar a tu función para obtener un salón disponible
      eventoAMutar.salon = await obtenerSalonDisponible(horarioC);
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
  // Penalizar falta de horas para las materias
  let penalizacionFaltaHoras = await penalizarFaltaHoras(individuo);
  // Retorna un valor que represente la aptitud del individuo
  return penalizacionCruces + penalizacionFaltaHoras;
}
const penalizarFaltaHoras = async (individuo:any) => {
  let penalizacionFaltaHoras = 0;
  const materias = [...new Set(individuo.eventos.map((evento) => evento.materia))];
  for (const materia of materias) {
    const eventosMateria = individuo.eventos.filter((evento) => evento.materia === materia);
    const duracionTotalMateria = eventosMateria.reduce((total, evento) => total + evento.duracion, 0);
    const materiaS = await MateriaModel.findOne({_id:materia});
    const horasSemanalesMateria = materiaS.horasSemanales; 
    // Ajusta según tus necesidades
    if (duracionTotalMateria < horasSemanalesMateria) {
      penalizacionFaltaHoras += horasSemanalesMateria - duracionTotalMateria;
    }
  }
  return penalizacionFaltaHoras;
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
export async function algoritmoGenetico(tamanoPoblacion: number, numGeneraciones: number, jornada:string) {
  let poblacion = await inicializarPoblacion(tamanoPoblacion, jornada);
  for (let generacion = 0; generacion < numGeneraciones; generacion++) {
    poblacion = await Promise.all(poblacion.map(async (individuo) => {
      return {individuo, aptitud: await calcularAptitud(individuo)}
  }));
    poblacion.sort((a, b) => a.aptitud - b.aptitud);
    const padresSeleccionados = poblacion.slice(0, tamanoPoblacion / 2);
    const puntoDeCruceEjemplo = 3;
    const descendencia = padresSeleccionados.map((padre, index) =>
      cruzar(padre.individuo, padresSeleccionados[index % padresSeleccionados.length].individuo, puntoDeCruceEjemplo)
    );
    poblacion = [...padresSeleccionados.map((padre) => padre.individuo), ...await Promise.all(descendencia.map(mutar))];
  }
  return poblacion[0].eventos;
}

// Función para generar eventos aleatorios con restricciones para toda la semana
export async function generarEventosAleatoriosSemana(jornada:any){
  const eventosSemana: Evento[] = [];
  const materias = await MateriaModel.find({});
  const materiasCheck = []
    for (const materiaAleatoria of materias) {
      const profesorDisponible = await obtenerProfesorDisponible2(materiaAleatoria._id);
      // Calcula el número máximo de eventos para esta materia en la semana
      let horasSemanalesMateria = materiaAleatoria.horasSemanales;
      // Genera el horario para los eventos de la materia aleatoria
      for (let i = 0; i < materiaAleatoria.sesiones; i++) {
        let profesorAsignado = null;
        let horaInicio;
        let horaFin;
        let horarioC;
        let duracionEvento: number = Math.floor(horasSemanalesMateria / (materiaAleatoria.sesiones - i));
        horasSemanalesMateria -= duracionEvento;
        while (!profesorAsignado) {
          horaInicio = generarHorarioAleatorio(duracionEvento, jornada);  // Ajusta según tus necesidades
          horaFin = moment(horaInicio).add(duracionEvento, 'hours').format("YYYY-MM-DDTHH:mm:ssZ");
          horarioC = convertirFormatoHorario({inicio:horaInicio, fin: horaFin});
          profesorAsignado = await obtenerProfesorAsignado(profesorDisponible?._id,horarioC);
        }
        const salonDisponible = await obtenerSalonDisponible(horarioC);
        const evento: any = {
          materia: materiaAleatoria?._id,
          profesor: profesorAsignado?._id,
          salon: salonDisponible?._id,
          horaInicio: horaInicio,
          horaFin: horaFin,
          materiaNombre:materiaAleatoria.nombre,
        }
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
      horaAleatoria = Math.floor(Math.random() * 11) + 7; // Entre las 7am y las 6pm
    } else if (tipo === 'nocturna') {
      horaAleatoria = Math.floor(Math.random() * 5) + 18; // Entre las 6pm y las 10pm
    } else if (tipo === 'mixta') {
      horaAleatoria = Math.floor(Math.random() * 15) + 7; // Entre las 7am y las 10pm
    }
    // Establece la hora en punto
    fechaElegida.set('hour', horaAleatoria);
    fechaElegida.set('minute', 0);  // Establece los minutos en 0 para que sea una hora en punto
    // Calcula la hora de finalización sumando la duración
    const horaFin = moment(fechaElegida).add(duracion, 'hours');
    //const horaFin = fechaElegida.clone().add(duracion, 'hours');
    // Verifica si la hora de finalización está dentro del rango permitido
    if (
      (tipo === 'diurna' && horaFin.isBefore(moment('18:00', 'HH:mm'))) ||
      (tipo === 'nocturna' && horaFin.isBefore(moment('22:00', 'HH:mm'))) ||
      (tipo === 'mixta' && horaFin.isBefore(moment('22:00', 'HH:mm')))
    ) {
      // Formatea la fecha en el formato deseado
      horarioAleatorio = fechaElegida.format();
    }
    // Si la hora de finalización excede el rango permitido, se repetirá el proceso
  } while (!horarioAleatorio);
  return horarioAleatorio;
}


async function obtenerProfesorDisponible2(materia: string) {
  const filter: any = {};
  filter.materias = materia;
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

export async function obtenerProfesorAsignado(profesorId: string, horarioC:any) {
  const filter: any = {};
  filter._id = profesorId;
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
  const profesoresDisponible = await ProfesorModel.findOne(filter).exec();
  return profesoresDisponible;
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
async function obtenerSalonDisponible(horarioC: any) {
  const filter: any = {};
  filter.ocupacion = {
    $not: {
      $elemMatch: {
        dia: horarioC.dia,
        inicio: { $lt: horarioC.fin },
        fin: { $gt: horarioC.inicio }
      }
    }
  }
  // Obtener todos los salones que cumplen con los criterios
  const salonesDisponibles = await SalonModel.find(filter).exec();
  if (salonesDisponibles.length === 0) {
    // No hay salones disponibles
    return null;
  }
  // Seleccionar aleatoriamente un salón de la lista
  const salonSeleccionado = salonesDisponibles[Math.floor(Math.random() * salonesDisponibles.length)];
  return salonSeleccionado;
}

export const crearEventos = async (jornada:any) => {
  const eventosGenerados = await algoritmoGenetico(100, 500, jornada ? 'diurna' : 'nocturna');
  return eventosGenerados
}
