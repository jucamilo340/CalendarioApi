// @ts-nocheck
import mongoose, { Document, Types } from "mongoose";

// Primero, define las interfaces
export interface IEventCalendar extends Document {
  title: string;
  start: Date;
  end: Date;
  backgroundColor: string;
  textColor: string;
  idHorario: string;
  materia: mongoose.Types.ObjectId;
  profesor: mongoose.Types.ObjectId;
  salon: mongoose.Types.ObjectId;
  grupo: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMateria extends Document {
  nombre: string;
  tipo: string;
  codigo: string;
  tipoSalon: string;
  sesiones: number;
  nivel: number;
  horasSemanales: number
  credits: number;
  requerimientos: Types.Array<Types.ObjectId | IMateria>;
  plan: mongoose.Types.ObjectId;
}

export interface IGrupo extends Document {
  nombre: string;
  codigo: string;
  semestre: number;
  cantidad: number;
  plan: mongoose.Types.ObjectId;
  diurno: false;
}

export interface IPlan extends Document {
  nombre: string;
  semestres: number;
  cantidad: number;
  horario: string;
}


interface IProfesor extends Document {
  nombre: string;
  cedula: number;
  fechaNacimiento?: Date;
  correoElectronico?: string;
  numeroTelefono?: string;
  tituloAcademico?: string;
  tipo?: string;
  idHorario?: string;
  materias: Types.Array<Types.ObjectId | IMateria>;
  ocupacion: RangoHorario[];
  salario?: number;
  auxiliar?: boolean;
}

export interface RangoHorario {
  dia: string;
  inicio: string;
  fin: string;
}

export interface RangoHorarioO {
  dia: string;
  inicio: string;
  fin: string;
  nombre: string;
  nombreClase: string;
  idEvent: string
}

export interface ISalon extends Document {
  nombre: string;
  tipo: string;
  codigo: string;
  facultad: string;
  capacidad: number;
  disponibilidad: RangoHorario[];
  ocupacion: RangoHorarioO[];
}

export interface IClase extends Document {
  materia: mongoose.Types.ObjectId;
  profesor: mongoose.Types.ObjectId;
  codigo: string;
  salon: mongoose.Types.ObjectId;
  horaInicio: string;
  horaFin: string;
}

export interface IAsignacion extends Document {
  materia: mongoose.Types.ObjectId;
  profesor: mongoose.Types.ObjectId;
  grupo: mongoose.Types.ObjectId;
}

// Luego, define los esquemas
const EventCalendarSchema = new mongoose.Schema<IEventCalendar>(
  {
    title: {
      type: String,
      required: true,
    },
    start: {
      type: Date,
      required: true,
    },
    end: {
      type: Date,
      required: true,
    },
    backgroundColor: {
      type: String,
      required: true,
    },
    textColor: {
      type: String,
      required: true,
    },
    idHorario: {
      type: String,
      required: false,
    },
    materia: { type: mongoose.Schema.Types.ObjectId, ref: 'Materia', required: true },
    profesor: { type: mongoose.Schema.Types.ObjectId, ref: 'Profesor', required: false },
    salon: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: false },
    grupo: { type: mongoose.Schema.Types.ObjectId, ref: 'Grupo', required: true },
  },
  {
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
    collection: "EventCalendar",
  }
);

const MateriaSchema = new mongoose.Schema<IMateria>({
  nombre: { type: String, required: true },
  sesiones: { type: Number, required: true },
  tipo: { type: String, required: true },
  codigo: { type: String, required: true },
  tipoSalon: { type: String, required: true },
  nivel: { type: Number, required: true },
  horasSemanales: { type: Number, required: true },
  credits: { type: Number, required: true },
  requerimientos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Materia', required: true }],
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
});

const GrupoSchema = new mongoose.Schema<IGrupo>({
  nombre: { type: String, required: true },
  semestre: { type: Number, required: true },
  cantidad: { type: Number, required: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
  diurno: { type: Boolean, required: true },
});

const PlanSchema = new mongoose.Schema<IPlan>({
  nombre: { type: String, required: true },
  semestres: { type: Number, required: true },
  horario: { type: String, required: true },
});

// const RangoHorarioSchema = new mongoose.Schema({
//   dia: { type: String, required: true },
//   inicio: { type: String, required: true },
//   fin: { type: String, required: true },
// });

const RangoHorarioOSchema = new mongoose.Schema({
  dia: { type: String, required: true },
  inicio: { type: String, required: true },
  fin: { type: String, required: true },
  nombre: { type: String, required: false },
  nombreClase: { type: String, required: false },
  idEvent: { type: mongoose.Schema.Types.ObjectId, ref: 'EventCalendar', required: true },
});


const ProfesorSchema = new mongoose.Schema<IProfesor>({
  nombre: { type: String, required: true },
  fechaNacimiento: { type: Date },
  cedula: { type: Number, required: true },
  correoElectronico: { type: String },
  numeroTelefono: { type: String },
  tituloAcademico: { type: String },
  tipo: { type: String },
  materias: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Materia', required: true }],
  ocupacion: { type: [RangoHorarioOSchema], required: true },
  salario: { type: Number },
  auxiliar: { type: Boolean },
});

const SalonSchema = new mongoose.Schema<ISalon>({
  nombre: { type: String, required: true },
  tipo: { type: String, required: true },
  codigo: { type: String, required: false },
  facultad: { type: String, required: true },
  capacidad: { type: Number, required: true },
  ocupacion: { type: [RangoHorarioOSchema], required: true },
});

const ClaseSchema = new mongoose.Schema<IClase>({
  materia: { type: mongoose.Schema.Types.ObjectId, ref: 'Materia', required: true },
  profesor: { type: mongoose.Schema.Types.ObjectId, ref: 'Profesor', required: true },
  salon: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true },
  horaInicio: { type: String, required: true },
  horaFin: { type: String, required: true },
});

const AsignacionSchema = new mongoose.Schema<IAsignacion>({
  materia: { type: mongoose.Schema.Types.ObjectId, ref: 'Materia', required: true },
  profesor: { type: mongoose.Schema.Types.ObjectId, ref: 'Profesor', required: false },
  grupo: { type: mongoose.Schema.Types.ObjectId, ref: 'Grupo', required: true },
});

// Finalmente, define los modelos
const EventCalendarModel = mongoose.model<IEventCalendar>("EventCalendar", EventCalendarSchema);
const MateriaModel = mongoose.model<IMateria>('Materia', MateriaSchema);
const ProfesorModel = mongoose.model<IProfesor>('Profesor', ProfesorSchema);
const SalonModel = mongoose.model<ISalon>('Salon', SalonSchema);
const GrupoModel = mongoose.model<IGrupo>('Grupo', GrupoSchema);
const ClaseModel = mongoose.model<IClase>('Clase', ClaseSchema);
const PlanModel = mongoose.model<IPlan>('Plan', PlanSchema);
const AsignacionModel = mongoose.model<IPlan>('Asignacion', AsignacionSchema);

export {
  EventCalendarModel,
  SalonModel,
  PlanModel,
  GrupoModel,
  AsignacionModel,
  ClaseModel,
  ProfesorModel,
  MateriaModel,
};