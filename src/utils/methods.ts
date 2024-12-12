import moment from 'moment-timezone';
import { AsignacionModel, EventCalendarModel, GrupoModel, ISalon, MateriaModel, ProfesorModel, SalonModel } from '../modules/EventCalendar/entities/Models';
import { CustomError } from '../shared/errors/CustomError';

interface HorarioEntrada {
  inicio: string;
  fin: string;
}

interface RangoHorarioSalida {
  dia: string;
  inicio: string;
  fin: string;
}

export function convertirFormatoHorarioReverso(rangoHorario: any): any {
  const diasSemana = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
  // Obtener el índice del día proporcionado
  const diaIndex = diasSemana.indexOf(rangoHorario.dia.toLowerCase());
  // Verificar si el día proporcionado es válido
  if (diaIndex === -1) {
    throw new Error("Día no válido");
  }
  // Calcular la fecha de inicio (2018-01-08) y ajustar al día proporcionado
  const fechaInicio = moment('2018-01-08').add(diaIndex, 'days');
  // Crear fechas y horas con la fecha de inicio y las horas proporcionadas
  const fechaInicioHorario = fechaInicio.clone().set({ hour: parseInt(rangoHorario.inicio.split(':')[0]), minute: parseInt(rangoHorario.inicio.split(':')[1]) });
  const fechaFinHorario = fechaInicio.clone().set({ hour: parseInt(rangoHorario.fin.split(':')[0]), minute: parseInt(rangoHorario.fin.split(':')[1]) });
  // Ajustar la zona horaria según tu necesidad
  const start = fechaInicioHorario.utcOffset(-5, true).toISOString();
  const end = fechaFinHorario.utcOffset(-5, true).toISOString();
  return {
    start,
    end,
  };
}

export function convertirFormatoHorario(horario: HorarioEntrada): RangoHorarioSalida {
  const diasSemana = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

  const fechaInicio = moment(horario.inicio).utcOffset(-5, true); // Ajusta la zona horaria según tu necesidad
  const diaInicio = diasSemana[fechaInicio.day()];
  const horaInicio = fechaInicio.format("HH:mm");

  const fechaFin = moment(horario.fin).utcOffset(-5, true); // Ajusta la zona horaria según tu necesidad
  const horaFin = fechaFin.format("HH:mm");

  return {
    dia: diaInicio,
    inicio: horaInicio,
    fin: horaFin
  };
}

export async function verificarHorasProfesor(profesorId: string): Promise<void> {
  try {
    // Obtener información del profesor
    const profesor:any = await ProfesorModel.findById(profesorId);
    if (!profesor) {
      throw new Error(`Error: No se encontró el profesor con ID ${profesorId}`);
    }
    // Definir límites de horas por tipo de profesor
    const limitesHoras:any = {
      catedratico: { min: 8, max: 16 },
      carrera: { min: 12, max: 16 },
      contrato: { min: 12, max: 16 },
    };
    // Obtener las horas asignadas al profesor
    const horasAsignadas = await obtenerHorasAsignadasPorProfesor(profesorId);
    // Verificar límites de horas para el tipo de profesor
    if (
      horasAsignadas < limitesHoras[profesor.tipo].min ||
      horasAsignadas > limitesHoras[profesor.tipo].max
    ) {
      throw new Error(
        `Error: El profesor ${profesor.nombre} supera el límite de horas permitidas.`
      );
    }
    console.log(`Verificación de horas para el profesor ${profesor.nombre} completada con éxito.`);
  } catch (error) {
    console.error('Error al verificar horas del profesor:', error);
    throw error;
  }
}
export async function obtenerHorasAsignadasPorProfesor(profesorId: string): Promise<number> {
  try {
    // Obtener eventos asignados al profesor
    const eventosAsignados = await EventCalendarModel.find({ profesor: profesorId });

    // Calcular la suma de las horas de los eventos asignados
    const horasAsignadas = eventosAsignados.reduce((total, evento) => {
      const duracionEvento = calcularDiferenciaHoras(evento.start, evento.end);
      return total + duracionEvento;
    }, 0);

    return horasAsignadas;
  } catch (error) {
    console.error('Error al obtener horas asignadas por profesor:', error);
    throw error;
  }
}

export async function calcularDuracionEvento (materiaId:string, grupoId:string) {
  const materia:any = await MateriaModel.findById(materiaId);
   const horasSemanales = materia.horasSemanales;
   const sesiones = materia.sesiones;
   const eventosExistenes = await EventCalendarModel.find({
     materia: materiaId,
     grupo: grupoId,
   });
   const duracionTotalExistente = eventosExistenes.reduce((total, ev) => total +calcularDiferenciaHoras(ev.start, ev.end), 0);
   const duracionTotalDeseada = duracionTotalExistente <= 0 ? (horasSemanales / sesiones) : horasSemanales;
   const duracionRestante = duracionTotalDeseada - duracionTotalExistente;
   return Math.ceil(duracionRestante);
}

function calcularDiferenciaHoras(start: Date, end: Date): number {
  if (start && end) {
    const diferenciaEnMilisegundos = Math.abs(end.getTime() - start.getTime());
    const diferenciaEnHoras = diferenciaEnMilisegundos / (1000 * 60 * 60);
    return diferenciaEnHoras;
  }
  return 0;
}

export function obtenerHorasAsignadasEnEventosSemana(profesorId: string, eventosSemana: any) {
  return eventosSemana.reduce((totalHoras: any, evento: any) => {
    if (evento.profesor && evento.profesor.equals(profesorId)) {
      const duracionEvento = moment(evento.horaFin).diff(evento.horaInicio, 'hours');
      return totalHoras + duracionEvento;
    }
    return totalHoras;
  }, 0);
}

export async function verificarMateriasAsignadas(): Promise<string[]> {
  const materias = await MateriaModel.find({});
  const materiasSinProfesor: string[] = [];
  for (const materia of materias) {
    const profesorAsignado = await ProfesorModel.findOne({ materias: materia._id });
    if (!profesorAsignado) {
      materiasSinProfesor.push(materia.nombre);
    }
  }
  if (materiasSinProfesor.length > 0) {
    return materiasSinProfesor;
  }
  return [];
}


export function areObjectsEqual(obj1, obj2) {
  // Primero, verifica que tengan el mismo número de propiedades
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
      return false;
  }

  // Luego, compara los valores de cada propiedad
  for (let key of keys1) {
      if (obj1[key] !== obj2[key]) {
          return false; // Son diferentes
      }
  }

  return true; // Son iguales
}

export async function AsignacionService(grupoId: string) {
    try {
      // Verificar si el grupo existe
      const grupo = await GrupoModel.findById(grupoId);
      if (!grupo) {
        throw new CustomError("Grupo no encontrado", 404);
      }

      const { semestre, plan } = grupo;

      // Obtener todas las materias del plan y semestre del grupo
      const materias = await MateriaModel.find({ nivel: semestre, plan });
      if (materias.length === 0) {
        throw new CustomError("No se encontraron materias para el plan y semestre especificados", 404);
      }

      // Crear asignaciones para cada materia
      const asignaciones = materias.map((materia) => ({
        materia: materia._id,
        profesor: null, // Campo profesor nulo
        grupo: grupo._id,
      }));

      // Insertar las asignaciones en la base de datos
      await AsignacionModel.insertMany(asignaciones);
    } catch (err) {
      console.error("Error al crear asignaciones:", err);
      throw err;
    }
}


export async function crearSalones() {
  try {
    const salones: Partial<ISalon>[] = [
      {
        nombre: '01D',
        tipo: 'Aula',
        codigo: '01D',
        facultad: 'Ingeniería',
        capacidad: 30,
        disponibilidad: [
        ],
        ocupacion: []
      },
      {
        nombre: '02D',
        tipo: 'Aula',
        codigo: '02D',
        facultad: 'Ingeniería',
        capacidad: 35,
        disponibilidad: [
        ],
        ocupacion: []
      },
      {
        nombre: '03D',
        tipo: 'Aula',
        codigo: '03D',
        facultad: 'Ingeniería',
        capacidad: 25,
        disponibilidad: [
        ],
        ocupacion: []
      },
      {
        nombre: '04D',
        tipo: 'Aula',
        codigo: '04D',
        facultad: 'Ciencias',
        capacidad: 40,
        disponibilidad: [
        ],
        ocupacion: []
      },
      {
        nombre: '05D',
        tipo: 'Aula',
        codigo: '05D',
        facultad: 'Ciencias',
        capacidad: 20,
        disponibilidad: [
        ],
        ocupacion: []
      }
    ];

    const salonesCreados = await SalonModel.create(salones);
    return salonesCreados;
  } catch (error) {
    console.error('Error al crear salones:', error);
    throw error;
  }
}
