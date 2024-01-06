import { Router } from "express";
import eventCalendarRoutes from "./eventCalendarRoutes";
import materiaRoutes from "./materiaRoutes";
import  profesorRoutes from "./profesorRoutes";
import  salonRoutes from "./salonesRoutes";

const routes = Router();

routes.use("/api/eventCalendar", eventCalendarRoutes);
routes.use("/api/materia", materiaRoutes);
routes.use("/api/profesor", profesorRoutes);
routes.use("/api/salon", salonRoutes);

export default routes;
