document.addEventListener("DOMContentLoaded", () => {
    const images = [...document.querySelectorAll(".gallery-img")];
    if (!images.length) return;

    const modal = document.getElementById("gallery-modal");
    const modalImg = document.getElementById("gallery-modal-img");
    const btnPrev = document.getElementById("gallery-prev");
    const btnNext = document.getElementById("gallery-next");
    const btnClose = document.getElementById("gallery-close");

    if (!modal || !modalImg || !btnPrev || !btnNext || !btnClose) return;

    let currentIndex = 0;

    const updateImage = () => {
        modalImg.src = images[currentIndex].src;
    };

    const openModal = index => {
        currentIndex = index;
        updateImage();
        modal.style.display = "flex";
        document.body.style.overflow = "hidden"; // prevent scrolling behind modal
    };

    const closeModal = () => {
        modal.style.display = "none";
        document.body.style.overflow = "";
    };

    const showNext = () => {
        currentIndex = (currentIndex + 1) % images.length;
        updateImage();
    };

    const showPrev = () => {
        currentIndex = (currentIndex - 1 + images.length) % images.length;
        updateImage();
    };

    // Add click handlers
    images.forEach((img, index) =>
        img.addEventListener("click", () => openModal(index))
    );

    btnClose.addEventListener("click", closeModal);
    btnNext.addEventListener("click", showNext);
    btnPrev.addEventListener("click", showPrev);

    // Close by clicking outside image
    modal.addEventListener("click", e => {
        if (e.target === modal) closeModal();
    });

    // Keyboard navigation
    document.addEventListener("keydown", e => {
        if (modal.style.display !== "flex") return;

        switch (e.key) {
            case "Escape":
                closeModal();
                break;
            case "ArrowRight":
                showNext();
                break;
            case "ArrowLeft":
                showPrev();
                break;
        }
    });
});
