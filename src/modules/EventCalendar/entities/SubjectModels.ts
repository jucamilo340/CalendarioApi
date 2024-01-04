import mongoose, { Document } from "mongoose";

const SubjectSchema = new mongoose.Schema<ISubject>(
  {
    name: {
      type: String,
      required: true,
    },
    hours: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
    collection: "Subject",
  }
);

export interface ISubject {
  name: string;
  hours: Number;
  createdAt: Date;
  updatedAt: Date;
}

const SubjectModel = mongoose.model(
  "SubjectSchema",
  SubjectSchema
);

export default SubjectModel;
