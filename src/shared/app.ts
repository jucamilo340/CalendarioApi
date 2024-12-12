import dotenv from "dotenv";
import express from "express";
import routes from "./routes";
import cors from "cors";
import "reflect-metadata"
import mongoose from "mongoose";

dotenv.config();
//mongoose.connect("mongodb+srv://jucamilo340:Mordetu340@cluster0.3rgdtrf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");
mongoose.connect("mongodb://127.0.0.1:27017/calendar");

const app = express();

app.get("/", (req, res) => {
    res.send("Hello World");
    });
app.use(express.json());
app.use(cors());
app.use(routes);

export default app;
