document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded");

  // Initialize Typed.js (if available)
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
  projectItems.forEach((item) => {
    item.style.cursor = "pointer";
    item.addEventListener("click", (e) => {
      if (!e.target.closest("a.project-link")) {
        const githubURL = item.getAttribute("data-github");
        if (githubURL) {
          window.open(githubURL, "_blank");
        }
      }
    });
  });

  // Set up the pizza icon click event for Joey's surprise
  const pizzaTrigger = document.getElementById("pizza-trigger");
  if (pizzaTrigger) {
    pizzaTrigger.addEventListener("click", () => {
      console.log("Pizza clicked");
      const audio = document.getElementById("joey-audio");
      if (audio) {
        audio.currentTime = 0;
        audio.volume = 0.1; // Joey.mp3 plays at 10%
        audio.play().catch((err) => {
          console.error("Audio playback failed:", err);
        });
      } else {
        console.error("Audio element not found.");
      }
      spawnFoodIcons();
    });
  } else {
    console.error("Pizza trigger element not found.");
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

// Function to play the pop sound for food items
function playPopSound() {
  const popAudio = new Audio("./assets/audio/pop.mp3");
  popAudio.volume = 0.6; // Pop sound at 60%
  popAudio.play().catch((err) => {
    console.error("Pop sound failed:", err);
  });
}

// Function to play the oven-ding sound at the end
function playOvenSound() {
  const ovenAudio = new Audio("./assets/audio/oven-ding.mp3");
  ovenAudio.volume = 0.6; // Oven sound at 60%
  ovenAudio.play().catch((err) => {
    console.error("Oven sound failed:", err);
  });
}

// Function to spawn food icons and show a subtle subtitle
function spawnFoodIcons() {
  const container = document.getElementById("food-animation-container");
  if (!container) {
    console.error("Food animation container not found.");
    return;
  }
  const foods = ["🍕", "🌭", "🍔", "🍩", "🍟"];
  const safeMargin = 150; // Avoid the very corners

  // Clear container in case previous animations remain
  container.innerHTML = "";

  // Spawn each food icon one after the other with a 0.3-second gap (faster popping)
  foods.forEach((food, index) => {
    setTimeout(() => {
      const foodEl = document.createElement("div");
      foodEl.classList.add("food-icon");
      foodEl.textContent = food;
      // Position each food icon at a random location within the viewport (with safe margins)
      const left = Math.random() * (window.innerWidth - 2 * safeMargin) + safeMargin;
      const top = Math.random() * (window.innerHeight - 2 * safeMargin) + safeMargin;
      foodEl.style.left = left + "px";
      foodEl.style.top = top + "px";
      container.appendChild(foodEl);
      playPopSound();
      foodEl.addEventListener("animationend", () => {
        foodEl.remove();
      });
    }, index * 300);
  });

  // After all food icons have popped up, play the oven-ding sound
  setTimeout(() => {
    playOvenSound();
  }, foods.length * 300 + 300);

  // Show a subtle subtitle message that fades in and out
  setTimeout(() => {
    const message = document.createElement("div");
    message.classList.add("joey-message");
    message.textContent = "Joey doesn't share food";
    container.appendChild(message);
    message.addEventListener("animationend", () => {
      message.remove();
    });
  }, 300);
}

