import { Request, Response } from "express";
import { CustomError } from "../../../../shared/errors/CustomError";
import {EventCalendarModel} from "../../entities/Models";

export class EventCalendarController {

  async getAll(request: Request, response: Response) {
    try {
      const eventsCalendar = await EventCalendarModel.find({});
      if (!eventsCalendar) {
        return [];
      }
      return response.status(200).json(eventsCalendar);
    } catch (err) {
      if (err instanceof CustomError) {
        response.status(err.status).json({ message: err.message });
      }
    }
  }
  async create(request: Request, response: Response) {
    try {
      const { eventCalendar = null } = request.body;
      if (!eventCalendar) throw new CustomError("Event Calendar not found", 400);
      const eventCalendarData = await new EventCalendarModel(eventCalendar).save();
      if (!eventCalendar) throw new CustomError("Internal server error", 400);
      return response.status(201).json(eventCalendarData);
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
        const eventCalendarExist =  await EventCalendarModel.findOne({id});
        if (!eventCalendarExist) throw new CustomError("Event Calendar not exist", 400);
        const deleteEventCalendar = await EventCalendarModel.findOneAndDelete({ id: eventCalendarExist.id });
        return response.status(200).json(deleteEventCalendar);
    } catch (err) {
        console.log(err);
      if (err instanceof CustomError) {
        response.status(err.status).json({ message: err.message });
      }
    }
  }
  async update(request: Request, response: Response) {
    const { eventCalendar = null } = request.body;

    try {
        const id = eventCalendar._id;
        if (!id) throw new CustomError("Event Calendar not found", 400);
        const eventCalendarExist = await EventCalendarModel.findOne({id});
  
        if (!eventCalendarExist) throw new CustomError("Internal server error", 400);
  
        for (const index in eventCalendar) {
          if (typeof eventCalendar[index] === "undefined") {
            delete eventCalendar[index];
          }
        }
        
        const eventCalendarData = await EventCalendarModel.findOneAndUpdate({
            _id: id,
          }, {
            $set: eventCalendar
          }, {
            new: true,
          })

      return response.status(201).json(eventCalendarData);
    } catch (err) {
      if (err instanceof CustomError) {
        response.status(err.status).json({ message: err.message });
      }
    }
  }
}
