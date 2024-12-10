import { Request, Response } from "express";
import { CustomError } from "../../../../shared/errors/CustomError";
import { AsignacionModel } from "../../entities/Models";

export class AsignacionController {
  async getAll(request: Request, response: Response) {
    try {
      const { materia, profesor, grupo } = request.query;
      const filter: any = {};

      if (materia) {
        filter.materia = materia;
      }
      if (profesor) {
        filter.profesor = profesor;
      }
      if (grupo) {
        filter.grupo = grupo;
      }

      const asignaciones = await AsignacionModel.find(filter)
        .populate("materia")
        .populate("profesor")
        .populate("grupo");
      return response.status(200).json(asignaciones);
    } catch (err) {
      console.error("Error al obtener asignaciones:", err);
      return response
        .status(500)
        .json({ message: "Error interno del servidor al obtener las asignaciones." });
    }
  }

  async create(request: Request, response: Response) {
    try {
      const { asignacion = null } = request.body;
      if (!asignacion) throw new CustomError("Asignacion not found", 400);

      const asignacionData = await new AsignacionModel(asignacion).save();
      if (!asignacionData) throw new CustomError("Internal server error", 500);

      return response.status(201).json(asignacionData);
    } catch (err) {
      if (err instanceof CustomError) {
        response.status(err.status).json({ message: err.message });
      } else {
        console.error("Error al crear asignacion:", err);
        response.status(500).json({ message: "Error interno del servidor al crear asignacion." });
      }
    }
  }

  async delete(request: Request, response: Response) {
    const { id } = request.params;
    try {
      if (!id) throw new CustomError("Id not found", 400);

      const asignacionExist = await AsignacionModel.findOne({ _id: id });
      if (!asignacionExist) throw new CustomError("Asignacion not exist", 404);

      const deleteAsignacion = await AsignacionModel.deleteOne({ _id: id });
      return response.status(200).json(deleteAsignacion);
    } catch (err) {
      console.error("Error al eliminar asignacion:", err);
      if (err instanceof CustomError) {
        response.status(err.status).json({ message: err.message });
      } else {
        response.status(500).json({ message: "Error interno del servidor al eliminar asignacion." });
      }
    }
  }

  async update(request: Request, response: Response) {
    const  asignacion  = request.body;
    try {
      const id = asignacion._id;
      if (!id) throw new CustomError("Asignacion not found", 400);

      const asignacionExist = await AsignacionModel.findOne({ _id: id });
      if (!asignacionExist) throw new CustomError("Asignacion not exist", 404);

      for (const index in asignacion) {
        if (typeof asignacion[index] === "undefined") {
          delete asignacion[index];
        }
      }
      if(asignacion.profesor === 1){
        asignacion.profesor = null;
      }

      const asignacionData = await AsignacionModel.findOneAndUpdate(
        { _id: id },
        { $set: asignacion },
        { new: true }
      );

      return response.status(200).json(asignacionData);
    } catch (err) {
      console.error("Error al actualizar asignacion:", err);
      if (err instanceof CustomError) {
        response.status(err.status).json({ message: err.message });
      } else {
        response.status(500).json({ message: "Error interno del servidor al actualizar asignacion." });
      }
    }
  }
}
