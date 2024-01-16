import { Request, Response } from "express";
import { CustomError } from "../../../../shared/errors/CustomError";
import {EventCalendarModel, ProfesorModel, SalonModel} from "../../entities/Models";
import { convertirFormatoHorario } from "../../../../utils/methods";
import { ObjectId } from 'mongodb';

export class EventCalendarController {

  async getAll(request: Request, response: Response) {
    try {
      const { grupoId }: any = request.query;
      const filter: any = {};
      if (grupoId) {
        filter.grupo = grupoId;
      }
      const eventsCalendar = await EventCalendarModel.find(filter)
        .populate('materia')
        .populate('profesor')
        .populate('salon')
        .exec();
  
      if (!eventsCalendar) {
        return response.status(200).json([]);
      }
  
      return response.status(200).json(eventsCalendar);
    } catch (err) {
      if (err instanceof CustomError) {
        response.status(err.status).json({ message: err.message });
      } else {
        response.status(500).json({ message: 'Internal Server Error' });
      }
    }
  }
  
  async create(request: Request, response: Response) {
    try {
      const { eventCalendar = null } = request.body;
      if (!eventCalendar) throw new CustomError("Event Calendar not found", 400);
      const eventCalendarData = await new EventCalendarModel(eventCalendar).save();
      if (!eventCalendar) throw new CustomError("Internal server error", 400);
      const nuevaOcupacion = convertirFormatoHorario({inicio:eventCalendar.start, fin: eventCalendar.end});
      nuevaOcupacion?.idEvent = eventCalendarData._id;
      await ProfesorModel.findOneAndUpdate(
          { _id: eventCalendar?.profesor },
          { $push: { ocupacion: nuevaOcupacion } },
          { new: true }
      );
      await SalonModel.findOneAndUpdate(
        { _id: eventCalendar?.salon },
        { $push: { ocupacion: nuevaOcupacion } },
        { new: true }
    );
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
        const objectId = new ObjectId(id);
        const eventCalendarExist =  await EventCalendarModel.findOne({ _id: objectId });
        if (!eventCalendarExist) throw new CustomError("Event Calendar not exist", 400);
        const deleteEventCalendar = await EventCalendarModel.findOneAndDelete({ _id: new ObjectId(eventCalendarExist._id)});
        await ProfesorModel.findOneAndUpdate(
          { 'ocupacion.idEvent': eventCalendarExist.id },
          { $pull: { ocupacion: { idEvent: eventCalendarExist.id } } },
          { new: true }
        );
        await SalonModel.findOneAndUpdate(
          { 'ocupacion.idEvent': eventCalendarExist.id },
          { $pull: { ocupacion: { idEvent: eventCalendarExist.id } } },
          { new: true }
        );
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
          });
          const nuevaOcupacion = convertirFormatoHorario({inicio:eventCalendar.start, fin: eventCalendar.end});
          nuevaOcupacion?.idEvent = eventCalendarExist._id;
          await ProfesorModel.findOneAndUpdate(
            { 'ocupacion.idEvent': eventCalendarExist.id },
            { $pull: { ocupacion: { idEvent: eventCalendarExist.id } } },
            { new: true }
          );
          await SalonModel.findOneAndUpdate(
            { 'ocupacion.idEvent': eventCalendarExist.id },
            { $pull: { ocupacion: { idEvent: eventCalendarExist.id } } },
            { new: true }
          );
           await ProfesorModel.findOneAndUpdate(
             { _id: eventCalendarExist?.profesor },
             { $push: { ocupacion: nuevaOcupacion } },
             { new: true }
           );
           await SalonModel.findOneAndUpdate(
             { _id: eventCalendarExist?.salon },
             { $push: { ocupacion: nuevaOcupacion } },
             { new: true });
          //await verificarDisponibilidadProfesor(eventCalendarExist?.profesor,{inicio:eventCalendar.start, fin: eventCalendar.end});

          return response.status(201).json(eventCalendarData);
    } catch (err) {
      if (err instanceof CustomError) {
        response.status(err.status).json({ message: err.message });
      }
    }
  }
}
