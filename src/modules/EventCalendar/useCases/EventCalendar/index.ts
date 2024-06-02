import { Request, Response } from "express";
import { CustomError } from "../../../../shared/errors/CustomError";
import {EventCalendarModel, GrupoModel, ProfesorModel, SalonModel} from "../../entities/Models";
import { calcularDuracionEvento, convertirFormatoHorario, convertirFormatoHorarioReverso, verificarMateriasAsignadas } from "../../../../utils/methods";
import { ObjectId } from 'mongodb';
import { crearEventos } from "../../../../utils/Generador";
import moment from "moment-timezone";

export class EventCalendarController {

  async getAll(request: Request, response: Response) {
    try {
      const { grupoId,filtros }: any = request.query;
      const filter: any = {};
      if (grupoId) {
        filter.grupo = grupoId;
      }
      if (JSON.parse(filtros).materia !== '') {
        filter.materia = JSON.parse(filtros).materia;
      }
      const nuevosEventos = [];
      if (JSON.parse(filtros).profesor !== '') {
        filter.profesor = JSON.parse(filtros).profesor;
        const profesorInfo = await ProfesorModel.findById(JSON.parse(filtros).profesor);
        if (profesorInfo) {
          for (const ocupacion of profesorInfo.ocupacion) {
            if (ocupacion.nombre) {
              // Crear un nuevo evento por cada ocupación del profesor con 
              const date = convertirFormatoHorarioReverso(ocupacion);
              const nuevoEvento = {
                title: ocupacion.nombre,
                start: date.start,
                end: date.end,
                backgroundColor: "#d32f2f",
                textColor: "#fff",
                materia: '',
                profesor: '',
                salon: '',
                grupo: '',
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              nuevosEventos.push(nuevoEvento);
            }
          }
        }
        
      }
      if (JSON.parse(filtros).salon !== '') {
        filter.salon = JSON.parse(filtros).salon;
      }
      const eventsCalendar = await EventCalendarModel.find(filter)
        .populate('materia')
        .populate('profesor')
        .populate('salon')
        .exec();
        const eventosCompletos = [...eventsCalendar, ...nuevosEventos];
      if (!eventsCalendar) {
        return response.status(200).json([]);
      }
  
      return response.status(200).json(eventosCompletos);
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
      const duracionEvento = await calcularDuracionEvento(eventCalendar.materia,eventCalendar.grupo);
      if (duracionEvento <= 0) throw new CustomError("Cantidad de Horas maximas en esta Asignatura", 400);
      const nuevaHoraFinal= moment(eventCalendar.start).add(duracionEvento, 'hours').format("YYYY-MM-DDTHH:mm:ssZ");
      eventCalendar.end = nuevaHoraFinal;
      const eventCalendarData = await new EventCalendarModel(eventCalendar).save();
      if (!eventCalendar) throw new CustomError("Internal server error", 400);
      const nuevaOcupacion = convertirFormatoHorario({inicio:eventCalendar.start, fin: nuevaHoraFinal});
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
  async generarHorario(request: Request, response: Response) {
    const { id } = request.params;
    try {
        if (!id) throw new CustomError("Id not found", 400);
        const objectId = new ObjectId(id);
        const grupoExist =  await GrupoModel.findOne({ _id: objectId });
        if (!grupoExist) throw new CustomError("Grupo not exist", 400);
        // const materiasSinP = await verificarMateriasAsignadas();
        // if(materiasSinP.length > 0){ 
        //   return response.status(400).json({ message: `Hay materias sin profesor asignado`});
        // }
        const eventos = await crearEventos(grupoExist?.diurno);
        const eventosG = eventos?.map((evento: any) => (
          {
            title: 'NaN',
            start: evento.horaInicio,
            end: evento.horaFin,
            backgroundColor: '#039be5',
            textColor: '#ffffff',
            profesor: evento?.profesor?._id ? evento?.profesor?._id : evento?.profesor,
            materia: evento?.materia?._id ? evento?.materia?._id : evento?.materia,
            salon: evento?.salon,
            grupo: grupoExist._id,
            idHorario: evento?.idHorario
          }));
          const eventosGenerados:any = await EventCalendarModel.insertMany(eventosG);
          await eventosGenerados.map(async (g:any)=>{
            const nuevaOcupacion = convertirFormatoHorario({inicio:g.start, fin: g.end});
            nuevaOcupacion?.idEvent = g._id;
            await ProfesorModel.findOneAndUpdate(
                { _id: g?.profesor },
                { $push: { ocupacion: nuevaOcupacion } },
                { new: true }
            );
            await SalonModel.findOneAndUpdate(
              { _id: g?.salon },
              { $push: { ocupacion: nuevaOcupacion } },
              { new: true }
          );
          })
          return response.status(200).json(eventosGenerados);
    } catch (err) {
        console.log(err);
      if (err instanceof CustomError) {
        return response.status(err.status).json({ message: err.message });
      }
    }
  }
  async deleteAll(request: Request, response: Response) {
    const { id } = request.params;
    try {
        if (!id) throw new CustomError("Id not found", 400);
        const objectId = new ObjectId(id);
        const eventosEliminados = await EventCalendarModel.find({ grupo: objectId });
        const result = await EventCalendarModel.deleteMany({ grupo: objectId });
        eventosEliminados.map(async (g: any) => {
        await ProfesorModel.findOneAndUpdate(
          { 'ocupacion.idEvent': g.id },
          { $pull: { ocupacion: { idEvent: g.id } } },
          { new: true }
        );
        await SalonModel.findOneAndUpdate(
          { 'ocupacion.idEvent': g.id },
          { $pull: { ocupacion: { idEvent: g.id } } },
          { new: true }
        );
      })
        return response.status(200).json(result);
    } catch (err) {
        console.log(err);
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
          { 'ocupacion.idEvent': eventCalendarExist._id },
          { $pull: { ocupacion: { idEvent: eventCalendarExist._id } } },
          { new: true }
        );
        await SalonModel.findOneAndUpdate(
          { 'ocupacion.idEvent': eventCalendarExist.id },
          { $pull: { ocupacion: { idEvent: eventCalendarExist._id } } },
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
        const eventos = await EventCalendarModel.find({ idHorario:eventCalendarExist.idHorario });
        if (!eventos || eventos.length === 0) {
          throw new Error('No se encontraron eventos con el idHorario proporcionado.');
        }
        const { _id, ...valoresActualizados } = eventCalendar;
        for (const evento of eventos) {
          try {
            const result = await EventCalendarModel.findOneAndUpdate(
              { _id: evento._id },
              { $set: valoresActualizados },
              { new: true }
            );
          } catch (error) {
            console.log(error);
          }
        }
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
             { _id: eventCalendar?.profesor },
             { $push: { ocupacion: nuevaOcupacion } },
             { new: true }
           );
           await SalonModel.findOneAndUpdate(
             { _id: eventCalendar?.salon },
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
  async updateDate(request: Request, response: Response) {
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
          return response.status(201).json(eventCalendarData);
    } catch (err) {
      if (err instanceof CustomError) {
        response.status(err.status).json({ message: err.message });
      }
    }
  }
}


