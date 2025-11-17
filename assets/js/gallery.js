document.addEventListener("DOMContentLoaded", () => {
    const images = Array.from(document.querySelectorAll(".gallery-img"));
    const modal = document.getElementById("gallery-modal");
    const modalImg = document.getElementById("gallery-modal-img");

    const btnPrev = document.getElementById("gallery-prev");
    const btnNext = document.getElementById("gallery-next");
    const btnClose = document.getElementById("gallery-close");

    let currentIndex = 0;

    function openModal(index) {
        currentIndex = index;
        modalImg.src = images[index].src;
        modal.style.display = "flex";
    }

    function closeModal() {
        modal.style.display = "none";
    }

    function showNext() {
        currentIndex = (currentIndex + 1) % images.length;
        modalImg.src = images[currentIndex].src;
    }

    function showPrev() {
        currentIndex = (currentIndex - 1 + images.length) % images.length;
        modalImg.src = images[currentIndex].src;
    }

    images.forEach((img, index) => {
        img.addEventListener("click", () => openModal(index));
    });

    btnClose.addEventListener("click", closeModal);
    btnNext.addEventListener("click", showNext);
    btnPrev.addEventListener("click", showPrev);

    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });

    document.addEventListener("keydown", e => {
        if (modal.style.display !== "flex") return;

        if (e.key === "Escape") closeModal();
        if (e.key === "ArrowRight") showNext();
        if (e.key === "ArrowLeft") showPrev();
    });
});
