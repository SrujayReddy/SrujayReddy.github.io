document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded");

  // Initialize Typed.js if available
  if (typeof Typed !== "undefined") {
    new Typed("#typed", {
      strings: ["a CS and DS Student", "an AI Enthusiast", "a Research Assistant"],
      typeSpeed: 60,
      backSpeed: 40,
      loop: true,
    });
  } else {
    console.error("Typed.js is not loaded.");
  }

  // Make each project tile clickable
  const projectItems = document.querySelectorAll(".project-item");
  if (projectItems.length === 0) {
    console.warn("No project items found.");
  }
  projectItems.forEach((item) => {
    item.style.cursor = "pointer";
    item.addEventListener("click", (e) => {
      // Prevent navigation if a nested project-link was clicked
      if (!e.target.closest("a.project-link")) {
        const githubURL = item.getAttribute("data-github");
        console.log("Project tile clicked. URL:", githubURL);
        if (githubURL) {
          window.open(githubURL, "_blank");
        }
      }
    });
  });

  // Set up the pizza icon click for Joey's surprise
  const pizzaTrigger = document.getElementById("pizza-trigger");
  if (!pizzaTrigger) {
    console.error("Pizza trigger element not found.");
  } else {
    pizzaTrigger.addEventListener("click", () => {
      console.log("Pizza clicked");
      const audio = document.getElementById("joey-audio");
      if (audio) {
        audio.currentTime = 0; // Reset audio if played before
        audio.play()
          .then(() => {
            console.log("Audio is playing.");
          })
          .catch((err) => {
            console.error("Audio playback failed:", err);
          });
      } else {
        console.error("Audio element not found.");
      }
      spawnFoodIcons();
    });
  }

  // Dark/Light mode toggle
  const toggleModeBtn = document.getElementById("toggleModeBtn");
  if (toggleModeBtn) {
    toggleModeBtn.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      if (document.body.classList.contains("dark-mode")) {
        localStorage.setItem("theme", "dark");
        toggleModeBtn.textContent = "Light Mode";
      } else {
        localStorage.setItem("theme", "light");
        toggleModeBtn.textContent = "Dark Mode";
      }
    });
  }

  // Persist saved theme
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
    if (toggleModeBtn) {
      toggleModeBtn.textContent = "Light Mode";
    }
  }

  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
});

// Function to spawn food icons and display Joey's message
function spawnFoodIcons() {
  const container = document.getElementById("food-animation-container");
  if (!container) {
    console.error("Food animation container not found.");
    return;
  }
  const foods = ["🍕", "🌭", "🍔", "🍩", "🍟"];
  const pizzaIcon = document.getElementById("pizza-trigger");
  const rect = pizzaIcon.getBoundingClientRect();

  foods.forEach((food) => {
    const foodEl = document.createElement("div");
    foodEl.classList.add("food-icon");
    foodEl.textContent = food;
    // Position the food icons randomly around the pizza icon
    foodEl.style.left = rect.left + Math.random() * 50 - 25 + "px";
    foodEl.style.top = rect.top + Math.random() * 50 - 25 + "px";
    container.appendChild(foodEl);
    foodEl.addEventListener("animationend", () => {
      foodEl.remove();
    });
  });

  // Create and show Joey's message
  const message = document.createElement("div");
  message.classList.add("joey-message");
  message.textContent = "Joey doesn't share food!";
  container.appendChild(message);
  message.addEventListener("animationend", () => {
    message.remove();
  });
}

