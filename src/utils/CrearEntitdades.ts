// @ts-nocheck
import mongoose from "mongoose";
import xlsx from "xlsx";
import {
  MateriaModel,
  ProfesorModel,
  GrupoModel,
  PlanModel,
  AsignacionModel,
  EventCalendarModel,
  SalonModel,
} from "../modules/EventCalendar/entities/Models";
import fs from "fs";
import path from "path";

// Función para generar un número de cédula único
function generarCedulaUnica(indice) {
  return 1000000000 + indice; // Cédulas únicas generadas en base al índice
}
export async function borrarTodosLosDatos() {
  try {
    await Promise.all([
      ProfesorModel.deleteMany({}),
      PlanModel.deleteMany({}),
      EventCalendarModel.deleteMany({}),
      MateriaModel.deleteMany({}),
      AsignacionModel.deleteMany({}),
      GrupoModel.deleteMany({}),
      SalonModel.updateMany({}, { ocupacion: [] }),
    ]);

    console.log("Todos los datos han sido eliminados exitosamente.");
  } catch (error) {
    console.error("Error al eliminar los datos:", error);
  }
}
// Función para procesar el archivo Excel
export async function procesarExcel() {
  try {
    // Leer el archivo Excel
    const rutaArchivo = path.resolve(__dirname, "../Assets/excel.xlsx");
    const workbook = xlsx.readFile(rutaArchivo);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    // Convertir a formato JSON
    const data = xlsx.utils.sheet_to_json(sheet);

    // Crear un Set para almacenar datos únicos
    const planes = new Set();
    const materias = [];
    const grupos = new Set();
    const profesores = new Set();
    const asignaciones = [];

    // Recorrer el archivo y procesar cada fila
    let indiceProfesor = 0; // Índice para generar cédulas únicas

    for (const row of data) {
      // Extraer datos
      const {
        "Código del pensum": codigoPensum,
        "Código de la asignatura": codigoAsignatura,
        "Nombre de asignatura": nombreAsignatura,
        Nivel: nivel,
        Grupo: grupo,
        "Nombre del docente": nombreDocente,
      } = row;

      // Añadir plan
      if (codigoPensum) {
        planes.add({
          nombre: `Plan ${codigoPensum}`,
          codigo_pensum: codigoPensum,
          semestres: 10, // Valor por defecto
          horario: "diurno", // Valor por defecto
        });
      }

      // Añadir materia
      if (codigoAsignatura && nombreAsignatura) {
        materias.push({
          codigo: codigoAsignatura,
          nombre: nombreAsignatura,
          nivel: parseInt(nivel, 10) || 1, // Nivel por defecto
          tipo: "aula", // Valor por defecto
          tipoSalon: "aula", // Valor por defecto
          sesiones: 2, // Valor por defecto
          horasSemanales: 4, // Valor por defecto
          credits: 3, // Valor por defecto
          codigoPensum,
        });
      }

      // Añadir grupo
      if (grupo) {
        grupos.add({
          nombre: grupo,
          codigo: `G${grupo}`, // Código único
          semestre: parseInt(nivel, 10) || 1,
          cantidad: 30, // Valor por defecto
          codigoPensum,
        });
      }

      // Añadir profesor
      if (nombreDocente) {
        profesores.add({
          nombre: nombreDocente,
          cedula: generarCedulaUnica(indiceProfesor++), // Generar cédula única
        });
      }

      // Crear asignación
      if (codigoAsignatura && grupo && nombreDocente) {
        asignaciones.push({
          codigoAsignatura,
          grupo,
          nombreDocente,
        });
      }
    }

    // Guardar datos en MongoDB
    await guardarDatos(
      Array.from(planes),
      materias,
      Array.from(grupos),
      Array.from(profesores),
      asignaciones
    );
  } catch (error) {
    console.error("Error al procesar el Excel:", error);
  }
}

// Función para guardar los datos en MongoDB
async function guardarDatos(planes, materias, grupos, profesores, asignaciones) {
  try {
    // Guardar planes
    for (const plan of planes) {
      let planExistente = await PlanModel.findOne({ codigo_pensum: plan.codigo_pensum });
      if (!planExistente) {
        planExistente = await PlanModel.create(plan);
      }

      // Guardar materias vinculadas al plan
      for (const materia of materias.filter((m) => m.codigoPensum === plan.codigo_pensum)) {
        const materiaExistente = await MateriaModel.findOne({ codigo: materia.codigo });
        if (!materiaExistente) {
          await MateriaModel.create({ ...materia, plan: planExistente._id });
        }
      }

      // Guardar grupos vinculados al plan
      for (const grupo of grupos.filter((g) => g.codigoPensum === plan.codigo_pensum)) {
        const grupoExistente = await GrupoModel.findOne({ nombre: grupo.nombre });
        if (!grupoExistente) {
          await GrupoModel.create({ ...grupo, plan: planExistente._id, diurno: true });
        }
      }
    }

    // Guardar profesores
    for (const profesor of profesores) {
      const profesorExistente = await ProfesorModel.findOne({ nombre: profesor.nombre });
      if (!profesorExistente) {
        await ProfesorModel.create(profesor);
      }
    }

    // Guardar asignaciones
    for (const asignacion of asignaciones) {
      const materia = await MateriaModel.findOne({ codigo: asignacion.codigoAsignatura });
      const grupo = await GrupoModel.findOne({ nombre: asignacion.grupo });
      const profesor = await ProfesorModel.findOne({ nombre: asignacion.nombreDocente });

      if (materia && grupo && profesor) {
        const asignacionExistente = await AsignacionModel.findOne({
          materia: materia._id,
          grupo: grupo._id,
          profesor: profesor._id,
        });
        if (!asignacionExistente) {
          await AsignacionModel.create({
            materia: materia._id,
            grupo: grupo._id,
            profesor: profesor._id,
          });
        }
      }
    }

    console.log("Datos guardados correctamente.");
  } catch (error) {
    console.error("Error al guardar los datos:", error);
  }
}
