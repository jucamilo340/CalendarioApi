import { Request, Response } from "express";
import { CustomError } from "../../../../shared/errors/CustomError";
import { SalonModel } from "../../entities/Models";
import { convertirFormatoHorario } from "../../../../utils/methods";

export class SalonController {

  async getAll(request: Request, response: Response) {
    try {
      const { horario,eventoId,tipoSalon }: any = request.query;
      const filter: any = {};
      if (tipoSalon) {
        filter.tipo = tipoSalon;
      }
      if (horario) {
        const horarioC = convertirFormatoHorario(JSON.parse(horario));
        // filter.disponibilidad = {
        //   $elemMatch: {
        //     dia: horarioC.dia,
        //     inicio: { $lte: horarioC.inicio },
        //     fin: { $gte: horarioC.fin }
        //   }
        // };
        console.log('horarioC', horario);
        filter.ocupacion = {
          $not: {
            $elemMatch: {
              dia: horarioC.dia,
              inicio: { $lte: horarioC.fin },
              fin: { $gt: horarioC.inicio },
              idEvent: { $ne: eventoId }
            }
          }
        }
      }
      const salones = await SalonModel.find(filter);
      console.log(salones[0])
      if (!salones) {
        return [];
      }
      return response.status(200).json(salones);
    } catch (err) {
      if (err instanceof CustomError) {
        response.status(err.status).json({ message: err.message });
      }
    }
  }

  async create(request: Request, response: Response) {
    try {
      const { salon = null } = request.body;
      if (!salon) throw new CustomError("Salon not found", 400);

      const salonData = await new SalonModel(salon).save();
      if (!salonData) throw new CustomError("Internal server error", 500);

      return response.status(201).json(salonData);
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

        const salonExist = await SalonModel.findOne({ _id: id });
        if (!salonExist) throw new CustomError("Salon not exist", 404);

        const deleteSalon = await SalonModel.deleteOne({ _id: id });
        return response.status(200).json(deleteSalon);
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

      const salon = await SalonModel.findOne({ _id: id });
      if (!salon) throw new CustomError("Salon not found", 404);

      return response.status(200).json(salon);
    } catch (err) {
      if (err instanceof CustomError) {
        response.status(err.status).json({ message: err.message });
      }
    }
  }

  async update(request: Request, response: Response) {
    const { salon = null } = request.body;

    try {
        const id = salon._id;
        if (!id) throw new CustomError("Salon not found", 400);

        const salonExist = await SalonModel.findOne({ _id: id });
        if (!salonExist) throw new CustomError("Salon not exist", 404);

        for (const index in salon) {
          if (typeof salon[index] === "undefined") {
            delete salon[index];
          }
        }
        
        const salonData = await SalonModel.findOneAndUpdate(
          { _id: id },
          { $set: salon },
          { new: true }
        );

        return response.status(200).json(salonData);
    } catch (err) {
      if (err instanceof CustomError) {
        response.status(err.status).json({ message: err.message });
      }
    }
  }
}
