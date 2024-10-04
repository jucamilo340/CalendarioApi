import { Router } from "express";
import eventCalendarRoutes from "./eventCalendarRoutes";
import materiaRoutes from "./materiaRoutes";
import  profesorRoutes from "./profesorRoutes";
import  salonRoutes from "./salonesRoutes";
import  grupoRoutes from "./grupoRoutes";
import  planRoutes from "./planRoutes";

const routes = Router();

routes.use("/api/eventCalendar", eventCalendarRoutes);
routes.use("/api/materia", materiaRoutes);
routes.use("/api/plan", planRoutes);
routes.use("/api/profesor", profesorRoutes);
routes.use("/api/salon", salonRoutes);
routes.use("/api/grupo", grupoRoutes);

export default routes;
