import { Request, Response } from "express";
import { CustomError } from "../../../../shared/errors/CustomError";
import { AsignacionModel, MateriaModel } from "../../entities/Models";

export class MateriaController {

  async getAll(request: Request, response: Response) {
    try {
      const { semestre } = request.query;
      const { plan } = request.query;
      const { grupo } = request.query;
      const filter: any = {};
      if (semestre) {
          filter.nivel = semestre;
      }
      if (plan) {
        filter.plan = plan;
    }
    if (grupo) {
      const asignaciones = await AsignacionModel.find({ grupo: grupo }).populate('materia');
      const materias = asignaciones.map((asignacion: any) => asignacion?.materia);
      return response.status(200).json(materias);
    }
      const materias = await MateriaModel.find(filter);
      return response.status(200).json(materias);
    } catch (err) {
      console.error('Error al obtener materias:', err);
      return response.status(500).json({ message: 'Error interno del servidor al obtener las materias.' });
    }
  }

  async create(request: Request, response: Response) {
    try {
      const { materia = null } = request.body;
      if (!materia) throw new CustomError("Materia not found", 400);

      const materiaData = await new MateriaModel(materia).save();
      if (!materiaData) throw new CustomError("Internal server error", 500);

      return response.status(201).json(materiaData);
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

        const materiaExist = await MateriaModel.findOne({ _id: id });
        if (!materiaExist) throw new CustomError("Materia not exist", 404);
        await AsignacionModel.deleteMany({ materia: id });
        const deleteMateria = await MateriaModel.deleteOne({ _id: id });
        return response.status(200).json(deleteMateria);
    } catch (err) {
        console.log(err);
      if (err instanceof CustomError) {
        response.status(err.status).json({ message: err.message });
      }
    }
  }

  async update(request: Request, response: Response) {
    const { materia = null } = request.body;

    try {
        const id = materia._id;
        if (!id) throw new CustomError("Materia not found", 400);

        const materiaExist = await MateriaModel.findOne({ _id: id });
        if (!materiaExist) throw new CustomError("Materia not exist", 404);

        for (const index in materia) {
          if (typeof materia[index] === "undefined") {
            delete materia[index];
          }
        }
        
        const materiaData = await MateriaModel.findOneAndUpdate(
          { _id: id },
          { $set: materia },
          { new: true }
        );

        return response.status(200).json(materiaData);
    } catch (err) {
      if (err instanceof CustomError) {
        response.status(err.status).json({ message: err.message });
      }
    }
  }
}
