// @ts-nocheck
import EventCalendarModel from "../modules/EventCalendar/entities/Models";
import SubjectModel from "../modules/EventCalendar/entities/SubjectModels";

interface ICreateEventCalendar {
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  textColor: string;
}

interface ISubjectCalendar {
  name: string;
  hours: Number;
}

interface IGetOneEventCalendar {
  _id: string
}

interface IUpdateEventCalendar {
  _id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  textColor: string;
}

interface IDeleteEventCalendar {
  _id: string;
}

export class SubjectRepository {
  async create(data: ISubjectCalendar) {
    try {
      return await new SubjectModel(data).save();
    } catch (err) {
      throw err;
    }
  }
}

export class EventCalendarRepository {
  async create(data: ICreateEventCalendar) {
    try {
      return await new EventCalendarModel(data).save();
    } catch (err) {
      throw err;
    }
  }

  async getAll() {
    try {
      return await EventCalendarModel.find({});
    } catch (err) {
      throw err;
    }
  }

  async getOne({ _id }: IGetOneEventCalendar) {
    try {
      return await EventCalendarModel.findOne({_id});
    } catch (err) {
      throw err;
    }
  }

  async delete({_id}: IDeleteEventCalendar) {
    try {
      return await EventCalendarModel.findOneAndDelete({_id});
    } catch (err) {
      throw err;
    }
  }

  async update(data: IUpdateEventCalendar) {
    try {
      return await EventCalendarModel.findOneAndUpdate({
        _id: data._id,
      }, {
        $set: data
      }, {
        new: true,
      })
    } catch (err) {
      throw err;
    }
  }
}
