import { Request, Response } from "express";
import { CustomError } from "../../../../shared/errors/CustomError";
import { ProfesorModel } from "../../entities/Models";

export class ProfesorController {

  async getAll(request: Request, response: Response) {
    try {
      const profesores = await ProfesorModel.find({});
      if (!profesores) {
        return [];
      }
      return response.status(200).json(profesores);
    } catch (err) {
      if (err instanceof CustomError) {
        response.status(err.status).json({ message: err.message });
      }
    }
  }

  async create(request: Request, response: Response) {
    try {
      const { profesor = null } = request.body;
      console.log(profesor);
      if (!profesor) throw new CustomError("Profesor not found", 400);

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
