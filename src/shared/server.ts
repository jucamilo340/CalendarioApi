import { crearEventos } from "../utils/Generador";
import app from "./app";

const PORT = process.env.PORT || 8080;
//crearEventos();


app.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}!`));
