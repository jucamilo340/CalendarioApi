import moment from 'moment-timezone';

interface HorarioEntrada {
  inicio: string;
  fin: string;
}

interface RangoHorarioSalida {
  dia: string;
  inicio: string;
  fin: string;
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