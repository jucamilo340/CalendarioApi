import { Request, Response } from "express";
import { CustomError } from "../../../../shared/errors/CustomError";
import { PlanModel } from "../../entities/Models";


export class PlanController {

  async getAll(request: Request, response: Response) {
    try {
      const planes = await PlanModel.find({});
      if (!planes) {
        return [];
      }
      return response.status(200).json(planes);
    } catch (err) {
      if (err instanceof CustomError) {
        response.status(err.status).json({ message: err.message });
      }
    }
  }

  async create(request: Request, response: Response) {
    try {
      const plan = request.body;
      if (!plan) throw new CustomError("Plan not found", 400);

      const planData = await new PlanModel(plan).save();
      if (!planData) throw new CustomError("Internal server error", 500);

      return response.status(201).json(planData);
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

      const planExist = await PlanModel.findOne({ _id: id });
      if (!planExist) throw new CustomError("Plan not exist", 404);

      const deletePlan = await PlanModel.deleteOne({ _id: id });
      return response.status(200).json(deletePlan);
    } catch (err) {
      console.log(err);
      if (err instanceof CustomError) {
        response.status(err.status).json({ message: err.message });
      }
    }
  }

  async update(request: Request, response: Response) {
    const { plan } = request.body;
    try {
      const id = plan._id;
      if (!id) throw new CustomError("Plan not found", 400);

      const planExist = await PlanModel.findOne({ _id: id });
      if (!planExist) throw new CustomError("Plan not exist", 404);

      for (const index in plan) {
        if (typeof plan[index] === "undefined") {
          delete plan[index];
        }
      }

      const planData = await PlanModel.findOneAndUpdate(
        { _id: id },
        { $set: plan },
        { new: true }
      );

      return response.status(200).json(planData);
    } catch (err) {
      if (err instanceof CustomError) {
        response.status(err.status).json({ message: err.message });
      }
    }
  }
}
