import dotenv from "dotenv";
import express from "express";
import routes from "./routes";
import cors from "cors";
import "reflect-metadata"
import mongoose from "mongoose";

dotenv.config();
mongoose.connect(process.env.MONGO_URL as string || "mongodb+srv://jucamilo340:Mordetu340@cluster0.3rgdtrf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");

const app = express();


app.use(express.json());
app.use(cors());
app.use(routes);

export default app;
