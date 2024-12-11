import { Request, Response } from "express";
import { CustomError } from "../../../../shared/errors/CustomError";
import { AsignacionModel, ProfesorModel } from "../../entities/Models";
import { convertirFormatoHorario, obtenerHorasAsignadasPorProfesor } from "../../../../utils/methods";

export class ProfesorController {

  async getAll(request: Request, response: Response) {
    try {
      const { materiaId, grupo, horario, eventoId }: any = request.query;
      const filter: any = {};
  
      // Aplicar filtro por materia si se proporciona
      if (materiaId) {
        filter.materia = materiaId;
      }
  
      // Aplicar filtro por grupo si se proporciona
      if (grupo) {
        filter.grupo = grupo;
      }
  
      // Aplicar filtro por horario si se proporciona
      if (horario) {
        const horarioC = convertirFormatoHorario(JSON.parse(horario));
        filter.ocupacion = {
          $not: {
            $elemMatch: {
              dia: horarioC.dia,
              inicio: { $lte: horarioC.fin },
              fin: { $gt: horarioC.inicio },
              idEvent: { $ne: eventoId },
            },
          },
        };
      }
  
      // Buscar asignaciones según los filtros
      const asignaciones = await AsignacionModel.find(filter).populate('profesor');
  
      const profesoresConHorasAsignadas = await Promise.all(
        asignaciones.map(async (asignacion: any) => {
          const profesor = asignacion.profesor;
          if (!profesor) return null;
  
          const horasAsignadas = await obtenerHorasAsignadasPorProfesor(profesor._id);
  
          return {
            ...profesor.toObject(),
            horasAsignadas,
          };
        })
      );
  
      // Filtrar nulos en caso de asignaciones sin profesor
      const resultado = profesoresConHorasAsignadas.filter(Boolean);
  
      return response.status(200).json(resultado);
    } catch (err) {
      if (err instanceof CustomError) {
        response.status(err.status).json({ message: err.message });
      } else {
        console.error('Error interno:', err);
        response.status(500).json({ message: "Internal server error" });
      }
    }
  }
  
  

  async create(request: Request, response: Response) {
    try {
      const { profesor = null } = request.body;
      if (!profesor) throw new CustomError("Profesor not found", 400);
      const existingProfesor = await ProfesorModel.findOne({ cedula: profesor.cedula });
    if (existingProfesor) {
      throw new CustomError("Profesor ya registrado con esta cedula", 409);
    }
      const profesorData = await new ProfesorModel(profesor).save();
      if (!profesorData) throw new CustomError("Internal server error", 500);

      return response.status(201).json(profesorData);
    } catch (err) {
      if (err instanceof CustomError) {
        response.status(err.status).json({ message: err.message });
      }
    }
  }

  async delete(request: Request, response: Response) {
    const { id } = request.params;
    try {
        if (!id) throw new CustomError("Id not found", 400);

        const profesorExist = await ProfesorModel.findOne({ _id: id });
        if (!profesorExist) throw new CustomError("Profesor not exist", 404);

        const deleteProfesor = await ProfesorModel.deleteOne({ _id: id });
        return response.status(200).json(deleteProfesor);
    } catch (err) {
        console.log(err);
      if (err instanceof CustomError) {
        response.status(err.status).json({ message: err.message });
      }
    }
  }

  async getById(request: Request, response: Response) {
    const { id } = request.params;
    try {
      if (!id) throw new CustomError("Id not found", 400);

      const profesor = await ProfesorModel.findOne({ _id: id });
      if (!profesor) throw new CustomError("Profesor not found", 404);

      return response.status(200).json(profesor);
    } catch (err) {
      if (err instanceof CustomError) {
        response.status(err.status).json({ message: err.message });
      }
    }
  }

  async update(request: Request, response: Response) {
    const { profesor = null } = request.body;

    try {
        const id = profesor._id;
        if (!id) throw new CustomError("Profesor not found", 400);

        const profesorExist = await ProfesorModel.findOne({ _id: id });
        if (!profesorExist) throw new CustomError("Profesor not exist", 404);

        for (const index in profesor) {
          if (typeof profesor[index] === "undefined") {
            delete profesor[index];
          }
        }
        
        const profesorData = await ProfesorModel.findOneAndUpdate(
          { _id: id },
          { $set: profesor },
          { new: true }
        );

        return response.status(200).json(profesorData);
    } catch (err) {
      if (err instanceof CustomError) {
        response.status(err.status).json({ message: err.message });
      }
    }
  }
}
