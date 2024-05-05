const socket = io();

socket.emit("login", {
  username: window.localStorage.getItem("username"),
  password: window.localStorage.getItem("password"),
});

socket.on("login", () => (location.href = "/login"));
socket.on("reload", () => {
  getImages();
  getUploadedImages(); // Neu hinzugefügt, um die hochgeladenen Bilder abzurufen
});

document
  .getElementById("uploadForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(event.target);

    await fetch("/upload", { method: "POST", body: formData })
      .then((res) => {
        showFeedback(true);
      })
      .catch(() => {
        showFeedback(false);
      });
  });

function showFeedback(status) {
  const errorMessageElement = document.getElementById("errorMessage");
  errorMessageElement.style.color = status ? "green" : "red";
  errorMessageElement.style.opacity = 1;
  errorMessageElement.innerText = status
    ? "Datei erfolgreich hochgeladen"
    : "Fehler beim Hochladen der Datei";
  const initTime = 2000;
  for (let i = 0; i < 100; i++) {
    setTimeout(() => {
      errorMessageElement.style.opacity = 1 - i / 100;
    }, i * 10 + initTime);
  }
}

function extrahiereSlug(url) {
  const urlTeile = url.split("/");
  return urlTeile[urlTeile.length - 1];
}

async function getImages() {
  try {
    const response = await fetch("/images", {
      method: "POST",
      body: JSON.stringify({
        username: window.localStorage.getItem("username"),
        password: window.localStorage.getItem("password"),
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const imageUrls = await response.json();

    const imageContainer = document.getElementById("imageContainer");
    imageContainer.innerHTML = "";
    let element;
    if (imageUrls.message === "Keine Bilder gefunden.") {
      imageContainer.innerText = "Keine Dinge vorhanden";
      imageContainer.style.display = "block";
      return;
    }
    imageUrls.forEach((url) => {
      const fileName = extrahiereSlug(url.url);
      console.log(fileName);
      if (fileName.match(/\.(jpeg|jpg|gif|png)$/i) !== null) {
        const img = document.createElement("img");
        element = img;
        img.src = url.url;
        img.style.width = "200px";
        img.style.height = "200px";
        img.style.margin = "10px";
      } else {
        if (url.text || url.text === "") {
          const p = document.createElement("textarea");
          p.addEventListener("keyup", (e) =>
            updateTextField(e.target.value, url.id)
          );
          p.value = url.text;
          element = p;
        } else {
          const p = document.createElement("p");
          element = p;
          p.innerText = fileName;
        }
      }
      let downloadBtn;
      if (!(url.text || url.text === "")) {
        downloadBtn = document.createElement("button");
        downloadBtn.innerText = "Download";
        downloadBtn.classList.add("image-action-btn");
        downloadBtn.addEventListener("click", function () {
          downloadImage(fileName, url.url);
        });
      }

      const sahreInp = document.createElement("input");
      sahreInp.classList.add("share-input");

      const sahreBtn = document.createElement("button");
      sahreBtn.innerText = "Teilen";
      sahreBtn.classList.add("share-btn");
      sahreBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        share(url.id, sahreInp);
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.innerText = "Delete";
      deleteBtn.classList.add("delete-btn");
      deleteBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        deleteImage(url.id);
      });

      const container = document.createElement("div");
      container.appendChild(sahreInp);
      container.appendChild(element);
      if (!(url.text || url.text === "")) container.appendChild(downloadBtn);
      container.appendChild(deleteBtn);
      container.appendChild(sahreBtn);
      imageContainer.appendChild(container);
    });

    document.getElementById("uploadForm").style.display = "none";
    imageContainer.style.display = "block";
  } catch (error) {
    console.error("Fehler beim Abrufen der Bilder:", error);
  }
}

async function updateTextField(value, id) {
  const response = await fetch("/updateTextField", {
    method: "Post",
    body: JSON.stringify({
      id: id,
      value: value,
      username: window.localStorage.getItem("username"),
      password: window.localStorage.getItem("password"),
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    if (response.message === "Login fehlgeschlagen") location.href = "/login";
    alert("Fehler beim Speichern");
  }
}

async function showImages() {
  document.getElementById("uploadForm").style.display = "none";
  getImages();
}

function showUpload() {
  document.getElementById("imageContainer").style.display = "none";
  document.getElementById("uploadForm").style.display = "block";
}

function downloadImage(filename, url) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.textContent = "Download " + filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

async function share(id, element) {
  const response = await fetch("/image/share", {
    method: "Post",
    body: JSON.stringify({
      id: id,
      username: element.value,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    alert("Fehler beim Teilen");
  }
}

async function deleteImage(imageId) {
  try {
    console.log(imageId);
    const response = await fetch(`/images/${imageId}`, {
      method: "DELETE",
    });
    if (response.ok) {
      getImages();
    } else {
      console.error("Fehler beim Löschen des Bildes");
    }
  } catch (error) {
    console.error("Fehler beim Löschen des Bildes:", error);
  }
}

document
  .getElementById("form")
  .addEventListener("submit", async function (event) {
    event.preventDefault();
    const formData = new FormData(this);
    const json = {
      username: window.localStorage.getItem("username"),
      password: window.localStorage.getItem("password"),
      time: document.getElementById("time").value,
    };
    formData.append("json", JSON.stringify(json));
    try {
      const response = await fetch("/upload", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        const result = await response.text();
        console.log("Serverantwort:", result);
      } else {
        console.error("Fehler beim Hochladen:", response.status);
      }
    } catch (error) {
      console.error("Fehler beim Hochladen:", error);
    }
  });

document
  .getElementById("createTextField")
  .addEventListener("click", async () => {
    const response = await fetch("/newTextField", {
      method: "POST",
      body: JSON.stringify({
        username: window.localStorage.getItem("username"),
        password: window.localStorage.getItem("password"),
        time: document.getElementById("time").value,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    const result = await response.json();
    if (response.ok) {
      console.log("Serverantwort:", result);
      showFeedback(true);
    } else {
      showFeedback(false);
      if (result.message === "Login fehlgeschlagen") location.href = "/login";
      console.error("Fehler beim Hochladen:", response.status);
    }
  });

async function getUploadedImages() {
  try {
    const response = await fetch("/images");
    const images = await response.json();

    const imageContainer = document.getElementById("imageContainer");
    imageContainer.innerHTML = ""; // Leere den Container, um neue Bilder einzufügen

    images.forEach((image) => {
      const img = document.createElement("img");
      img.src = image.url;
      img.alt = "Uploaded Image";
      imageContainer.appendChild(img);
    });

    // Zeige den Container an, wenn Bilder vorhanden sind
    imageContainer.style.display = images.length > 0 ? "block" : "none";
  } catch (error) {
    console.error("Fehler beim Abrufen der Bilder:", error);
  }
}
