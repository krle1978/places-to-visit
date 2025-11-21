window.addEventListener("load", () => {
    const form = document.getElementById("contactForm");
    if (!form) return;

    const nameField = document.getElementById("name");
    const emailField = document.getElementById("email");
    const messageField = document.getElementById("message");

    const nameError = document.getElementById("nameError");
    const emailError = document.getElementById("emailError");
    const messageError = document.getElementById("messageError");
    const successMsg = document.getElementById("successMsg");

    const submitBtn = document.querySelector(".contact-send");

    // Regex za email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        // RESET STANJA
        nameError.style.display = "none";
        emailError.style.display = "none";
        messageError.style.display = "none";
        successMsg.style.display = "none";

        let valid = true;

        // VALIDACIJA IMENA
        if (nameField.value.trim().length < 2) {
            nameError.innerText = "Name must be at least 2 characters long.";
            nameError.style.display = "block";
            valid = false;
        }

        // VALIDACIJA EMAILA
        if (!emailRegex.test(emailField.value.trim())) {
            emailError.innerText = "Please enter a valid email address.";
            emailError.style.display = "block";
            valid = false;
        }

        // VALIDACIJA PORUKE
        if (messageField.value.trim().length < 5) {
            messageError.innerText = "Message must be at least 5 characters long.";
            messageError.style.display = "block";
            valid = false;
        }

        if (!valid) return;

        // DISABLE BUTTON + LOADING
        submitBtn.disabled = true;
        submitBtn.innerText = "Sending…";

        // PODACI KOJI IDU NA TVOJ MAIL SERVER
        const data = {
            name: nameField.value.trim(),
            email: emailField.value.trim(),
            message: messageField.value.trim(),
        };

        try {
            const response = await fetch("/api/send-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                successMsg.innerText = "Your message has been sent! Thank you 😊";
                successMsg.style.display = "block";
                form.reset();
            } else {
                successMsg.innerText = "Something went wrong… try again later.";
                successMsg.style.display = "block";
                successMsg.style.color = "#dc2626"; // red
            }
        } catch (err) {
            successMsg.innerText = "Network error. Please try again.";
            successMsg.style.display = "block";
            successMsg.style.color = "#dc2626";
        }

        // VRATI DUGME
        submitBtn.disabled = false;
        submitBtn.innerText = "Send Message";
    });
});
