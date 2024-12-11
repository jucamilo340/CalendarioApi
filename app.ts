import app from "./src/shared/app";

const PORT = process.env.PORT || 8080;


app.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}!`));
