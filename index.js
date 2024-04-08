document
.getElementById("uploadForm")
.addEventListener("submit", async (event) => {
  event.preventDefault(); // Verhindert das Standardverhalten des Formulars

  const formData = new FormData(event.target); // Erfasse die Formulardaten
  const file = formData.get("image"); // Hole das ausgewählte Bild

  // Hier kannst du das Bild hochladen oder weitere Aktionen durchführen
  await fetch("/upload", { method: "POST", body: formData })
    .then((res) => {
      showFeedback(true);
    })
    .catch(() => {
      showFeedback(false);
    });
  // Zeige stattdessen einen Alert an
});

function showFeedback(status) {
const errorMessageElement = document.getElementById("errorMessage");
errorMessageElement.style.color = status ? "green" : "red";
errorMessageElement.style.opacity = 1;
errorMessageElement.innerText = status
  ? "Datei erfolgreich hochgeladen"
  : "Fehler beim hochladen der Datei";
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
  const response = await fetch("/images");
  const imageUrls = await response.json();

  const imageContainer = document.getElementById("imageContainer");
  imageContainer.innerHTML = "";
  let element;
  console.log(imageUrls)
  imageUrls.forEach((url) => {
    const fileName = extrahiereSlug(url.url);
    console.log(fileName);
    const isImage = fileName.substr(fileName.length - 3);
    if (fileName.match(/\.(jpeg|jpg|gif|png)$/i) !== null) {
      const img = document.createElement("img");
      element = img;
      img.src = url.url;
      img.style.width = "200px";
      img.style.height = "auto";
      img.style.margin = "10px";
    } else {
      const p = document.createElement("p");
      element = p;
      p.innerText = fileName;
    }

    const downloadBtn = document.createElement("button");
    downloadBtn.className = "download-btn";
    downloadBtn.innerText = "Download";
    downloadBtn.addEventListener("click", function (event) {
      event.stopPropagation(); // Prevent the click event from bubbling up to the image
      downloadImage(fileName, url.url);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.innerText = "Delete";
    deleteBtn.addEventListener("click", function (event) {
      event.stopPropagation(); // Prevent the click event from bubbling up to the image
      deleteImage(url.id);
    });

    const container = document.createElement("div");
    container.appendChild(element);
    container.appendChild(downloadBtn);
    container.appendChild(deleteBtn);
    imageContainer.appendChild(container);
  });

  document.getElementById("uploadForm").style.display = "none";
  imageContainer.style.display = "block";
} catch (error) {
  console.error("Fehler beim Abrufen der Bilder:", error);
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
anchor.download = filename; // Der gewünschte Dateiname
anchor.click();
}

async function deleteImage(imageId) {
try {
  console.log(imageId);
  const response = await fetch(`/images/${imageId}`, {
    method: "DELETE",
  });
  if (response.ok) {
    getImages(); // Bilder neu laden, um die Aktualisierung anzuzeigen
  } else {
    console.error("Fehler beim Löschen des Bildes");
  }
} catch (error) {
  console.error("Fehler beim Löschen des Bildes:", error);
}
}