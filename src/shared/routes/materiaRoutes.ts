import { Router } from "express";
import { MateriaController } from "../../modules/EventCalendar/useCases/Materias";

const eventCalendarRoutes = Router();

const materiaController = new MateriaController();
eventCalendarRoutes.post("/", materiaController.create);
eventCalendarRoutes.get("/all", materiaController.getAll);
eventCalendarRoutes.get("/:id", materiaController.getAll);
eventCalendarRoutes.put("/", materiaController.update);
eventCalendarRoutes.delete("/:id", materiaController.delete);

export default eventCalendarRoutes;
