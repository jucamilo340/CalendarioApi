import { Request, Response } from "express";
import { CustomError } from "../../../../shared/errors/CustomError";
import { AsignacionModel, GrupoModel } from "../../entities/Models"; // Assuming you have a GrupoModel
import { AsignacionService } from "../../../../utils/methods";

export class GrupoController {

  async getAll(request: Request, response: Response) {
    try {
      const grupos = await GrupoModel.find({});
      if (!grupos) {
        return [];
      }
      return response.status(200).json(grupos);
    } catch (err) {
      if (err instanceof CustomError) {
        response.status(err.status).json({ message: err.message });
      }
    }
  }

  async create(request: Request, response: Response) {
    try {
      const  grupo  = request.body;
      if (!grupo) throw new CustomError("Grupo not found", 400);

      const grupoData = await new GrupoModel(grupo).save();
      if (!grupoData) throw new CustomError("Internal server error", 500);
      AsignacionService(grupoData._id);
      return response.status(201).json(grupoData);
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

        const grupoExist = await GrupoModel.findOne({ _id: id });
        if (!grupoExist) throw new CustomError("Grupo not exist", 404);

        const deleteGrupo = await GrupoModel.deleteOne({ _id: id });
        return response.status(200).json(deleteGrupo);
    } catch (err) {
        console.log(err);
      if (err instanceof CustomError) {
        response.status(err.status).json({ message: err.message });
      }
    }
  }

  async update(request: Request, response: Response) {
    const { grupo  } = request.body;
    try {
        const id = grupo._id;
        if (!id) throw new CustomError("Grupo not found", 400);

        const grupoExist = await GrupoModel.findOne({ _id: id });
        if (!grupoExist) throw new CustomError("Grupo not exist", 404);

        for (const index in grupo) {
          if (typeof grupo[index] === "undefined") {
            delete grupo[index];
          }
        }
        
        const grupoData = await GrupoModel.findOneAndUpdate(
          { _id: id },
          { $set: grupo },
          { new: true }
        );

        return response.status(200).json(grupoData);
    } catch (err) {
      if (err instanceof CustomError) {
        response.status(err.status).json({ message: err.message });
      }
    }
  }

  async obtenerAsignacionesPorGrupo(request: Request, response: Response) {
    try {
      const { id } = request.params;
  
      if (!id) {
        return response.status(400).json({ message: "El ID del grupo es requerido" });
      }
  
      const asignaciones = await AsignacionModel.find({ grupo: id })
        .populate("materia") // Opcional: Poblamos los datos relacionados con materia
        .populate("profesor") // Opcional: Poblamos los datos relacionados con profesor
        .populate("grupo"); // Opcional: Poblamos los datos relacionados con grupo
  
      if (!asignaciones || asignaciones.length === 0) {
        return response.status(200).json([]);
      }
  
      return response.status(200).json(asignaciones);
    } catch (err) {
      console.error("Error al obtener asignaciones por grupo:", err);
      return response.status(500).json({ message: "Error interno del servidor" });
    }
  }
  
}
