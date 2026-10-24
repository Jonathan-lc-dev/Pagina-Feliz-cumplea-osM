import os
from flask import Flask, send_from_directory

# "public" se sirve en la raíz: sirve igual en Flask, Vercel y como carpeta estática en Netlify.
app = Flask(__name__, static_folder="public", static_url_path="")


@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)
