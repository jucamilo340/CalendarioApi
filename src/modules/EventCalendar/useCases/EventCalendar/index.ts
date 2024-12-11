// @ts-nocheck
import { Request, Response } from "express";
import { CustomError } from "../../../../shared/errors/CustomError";
import {AsignacionModel, EventCalendarModel, GrupoModel, MateriaModel, ProfesorModel, SalonModel} from "../../entities/Models";
import { areArraysDifferent, areObjectsEqual, calcularDuracionEvento, convertirFormatoHorario, convertirFormatoHorarioReverso, verificarMateriasAsignadas } from "../../../../utils/methods";
import { ObjectId } from 'mongodb';
import { crearEventos } from "../../../../utils/Generador";
import moment from "moment-timezone";
import { borrarTodosLosDatos, procesarExcel } from "../../../../utils/CrearEntitdades";

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
      eventCalendar.idHorario =  eventCalendar?.materia + eventCalendar.profesor + eventCalendar.grupo;
      const eventCalendarData = await new EventCalendarModel(eventCalendar).save();
      if (!eventCalendar) throw new CustomError("Internal server error", 400);
      const nuevaOcupacion = convertirFormatoHorario({inicio:eventCalendar.start, fin: nuevaHoraFinal});
      const materia = await MateriaModel.findOne({_id: eventCalendar?.materia});
      nuevaOcupacion?.nombreClase = materia?.nombre;
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
    const { accion } = request.body;
    if(accion === 'crear') {
      try {
        await borrarTodosLosDatos();
        await procesarExcel();
        return response.status(200).json({ message: "Horario generado" });
      } catch (error) {
        if (error instanceof CustomError) {
          return response.status(error.status).json({ message: error.message });
        }
      }
    }
    if(accion === 'borrar') {
      try {
        await borrarTodosLosDatos();
        return response.status(200).json({ message: "Horario generado" });
      } catch (error) {
        if (error instanceof CustomError) {
          return response.status(error.status).json({ message: error.message });
        }
      }
    }
    try {
        if (!id) throw new CustomError("Id not found", 400);
        const objectId = new ObjectId(id);
        const grupoExist =  await GrupoModel.findOne({ _id: objectId });
        const report: { incident: string; }[] = [];
        const eventosG: any = [];
        if (!grupoExist) throw new CustomError("Grupo not exist", 400);
        // const materiasSinP = await verificarMateriasAsignadas();
        // if(materiasSinP.length > 0){ 
        //   return response.status(400).json({ message: `Hay materias sin profesor asignado`});
        // }
        const eventos = await crearEventos(grupoExist);
        await eventos?.map((evento: any) => {
          eventosG.push({
            title: 'NaN',
            start: evento.horaInicio,
            end: evento.horaFin,
            backgroundColor: evento?.profesor ? '#039be5' : "#f6bf26",
            textColor: '#ffffff',
            profesor: evento?.profesor?._id ? evento?.profesor?._id : null,
            materia: evento?.materia,
            salon: evento?.salon ? evento?.salon?._id : null,
            grupo: grupoExist._id,
            idHorario: evento?.idHorario
          });
          if(!evento?.profesor){
            report.push({
              incident: "No hay profesor asignado para la Asignatura de" + evento?.materia?.nombre,
            })
          }
        });
          const eventosGenerados:any = await EventCalendarModel.insertMany(eventosG);
          await eventosGenerados.map(async (g:any)=>{
            const materia = await MateriaModel.findOne({_id: g?.materia});
            const nuevaOcupacion: any = convertirFormatoHorario({inicio:g.start, fin: g.end});
            nuevaOcupacion.nombreClase = materia?.nombre;
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
          });
          return response.status(200).json({events: eventosGenerados, report: report});
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
        const idExist = new ObjectId(g._id);
        await ProfesorModel.findOneAndUpdate(
          { 'ocupacion.idEvent': idExist },
          { $pull: { ocupacion: { idEvent: idExist } } },
          { new: true }
        );
        await SalonModel.findOneAndUpdate(
          { 'ocupacion.idEvent': idExist },
          { $pull: { ocupacion: { idEvent: idExist } } },
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
        const idExist = new ObjectId(eventCalendarExist._id);
        const deleteEventCalendar = await EventCalendarModel.findOneAndDelete({ _id: idExist});
        await ProfesorModel.findOneAndUpdate(
          { 'ocupacion.idEvent': idExist },
          { $pull: { ocupacion: { idEvent: idExist } } },
          { new: true }
        );
        await SalonModel.findOneAndUpdate(
          { 'ocupacion.idEvent': idExist },
          { $pull: { ocupacion: { idEvent: idExist } } },
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
        const id = new ObjectId(eventCalendar._id);
        if (!id) throw new CustomError("Event Calendar not found", 400);
        const eventCalendarExist = await EventCalendarModel.findOne({_id: id});
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
        const newSalon = valoresActualizados?.salon;
        delete valoresActualizados?.salon;
        for (const evento of eventos) {
          try {
            const nuevaOcupacion = convertirFormatoHorario({inicio:evento.start, fin: evento.end});
            const idExist = new ObjectId(evento._id);
            await ProfesorModel.updateOne(
              { _id: evento.profesor },
              { $pull: { ocupacion: { idEvent: idExist } } },
            );
             await EventCalendarModel.findOneAndUpdate(
              { _id: new ObjectId(evento._id) },
              { $set: valoresActualizados },
            );
          nuevaOcupacion?.idEvent = idExist;
      
           await ProfesorModel.updateOne(
             { _id: valoresActualizados?.profesor },
             { $push: { ocupacion: nuevaOcupacion } },
           );
          
          //  await SalonModel.updateOne(
          //    { _id: valoresActualizados?.salon },
          //    { $push: { ocupacion: nuevaOcupacion } });
          } catch (error) {
            console.log(error);
          }
        } 
        const newAsignacion = {
          grupo: eventCalendar.grupo,
          materia: eventCalendar.materia,
          profesor: eventCalendar.profesor,
        }
        const evento = await EventCalendarModel.find({ _id: _id });
        const nuevaOcupacionSalon = convertirFormatoHorario({inicio:evento[0]?.start, fin: evento[0]?.end});
        nuevaOcupacionSalon?.idEvent = _id;
        await EventCalendarModel.updateOne(
          { _id: _id },
          { $set: { salon: newSalon} }
        );
        await SalonModel.updateOne(
           { _id: evento[0]?.salon},
            { $pull: { ocupacion: { idEvent: _id } } },
          );
          await SalonModel.updateOne(
              { _id: newSalon },
              { $push: { ocupacion: nuevaOcupacionSalon } });
          //await verificarDisponibilidadProfesor(eventCalendarExist?.profesor,{inicio:eventCalendar.start, fin: eventCalendar.end});
          return response.status(201).json(eventCalendar);
    } catch (err) {
      if (err instanceof CustomError) {
        response.status(err.status).json({ message: err.message });
      }
    }
  }
  async updateDate(request: Request, response: Response) {
    const { eventCalendar = null } = request.body;
    try {
      const id = new ObjectId(eventCalendar._id);
      if (!id) throw new CustomError("Event Calendar not found", 400);
  
      const eventCalendarExist = await EventCalendarModel.findOne({ _id: id });
      if (!eventCalendarExist) throw new CustomError("Internal server error", 400);
  
      // Limpiar campos no definidos del objeto eventCalendar
      for (const index in eventCalendar) {
        if (typeof eventCalendar[index] === "undefined") {
          delete eventCalendar[index];
        }
      }
  
      const nuevaOcupacion = convertirFormatoHorario({
        inicio: eventCalendar.start,
        fin: eventCalendar.end
      });
      const OcupacionOld = convertirFormatoHorario({
        inicio: eventCalendarExist.start,
        fin: eventCalendarExist.end
      });
      if(areObjectsEqual(OcupacionOld, nuevaOcupacion)){
        return;
      }
      const materia = await MateriaModel.findOne({_id: eventCalendarExist?.materia});
      nuevaOcupacion.nombreClase = materia?.nombre;
      nuevaOcupacion.idEvent = eventCalendarExist._id;
      // Verificar conflictos de ocupación del profesor
      const profesorOcupacionConflicto = await ProfesorModel.findOne({
        _id: eventCalendarExist.profesor,
        ocupacion: {
          $elemMatch: {
            dia: nuevaOcupacion.dia,
            inicio: { $lt: nuevaOcupacion.fin },
            fin: { $gt: nuevaOcupacion.inicio },
            idEvent: { $ne: eventCalendarExist._id } // Excluir la ocupación del evento actual
          }
        }
      });

      if (profesorOcupacionConflicto) {
        throw new CustomError("Conflicto de ocupación para el profesor", 400);
      }
  
      // Verificar conflictos de ocupación del salón
      const salonOcupacionConflicto = await SalonModel.findOne({
        _id: eventCalendarExist.salon,
        ocupacion: {
          $elemMatch: {
            dia: nuevaOcupacion.dia,
            inicio: { $lt: nuevaOcupacion.fin },
            fin: { $gt: nuevaOcupacion.inicio },
            idEvent: { $ne: eventCalendarExist._id }
          }
        }
      });
  
      if (salonOcupacionConflicto) {
        throw new CustomError("Conflicto de ocupación para el salón", 400);
      }
  
      // Actualizar el evento en EventCalendar
      const eventCalendarData = await EventCalendarModel.findOneAndUpdate(
        { _id: id },
        { $set: eventCalendar },
        { new: true }
      );
  
      // Actualizar ocupaciones del profesor y del salón
      await ProfesorModel.updateOne(
        { _id: eventCalendarExist.profesor },
        { $pull: { ocupacion: { idEvent: eventCalendarExist._id } } }
      );
  
      await SalonModel.updateOne(
        { _id: eventCalendarExist.salon },
        { $pull: { ocupacion: { idEvent: eventCalendarExist._id } } }
      );
  
      await ProfesorModel.updateOne(
        { _id: eventCalendarExist.profesor },
        { $push: { ocupacion: nuevaOcupacion } }
      );
  
      await SalonModel.updateOne(
        { _id: eventCalendarExist.salon },
        { $push: { ocupacion: nuevaOcupacion } }
      );
  
      return response.status(201).json(eventCalendarData);
    } catch (err) {
      if (err instanceof CustomError) {
        return response.status(err.status).json({ message: err.message });
      }
      return response.status(500).json({ message: "Error interno del servidor" });
    }
  }
  
}


