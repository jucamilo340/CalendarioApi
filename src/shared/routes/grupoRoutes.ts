import { Router } from "express";
import { GrupoController } from "../../modules/EventCalendar/useCases/Grupo"; // Assuming you have a GrupoController

const eventCalendarRoutes = Router();

const grupoController = new GrupoController();
eventCalendarRoutes.post("/", grupoController.create);
eventCalendarRoutes.get("/all", grupoController.getAll);
//eventCalendarRoutes.get("/:id", grupoController.get);
eventCalendarRoutes.put("/", grupoController.update);
eventCalendarRoutes.delete("/:id", grupoController.delete);

export default eventCalendarRoutes;
