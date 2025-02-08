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

// Function to play the pop sound for food items at 30% volume
function playPopSound() {
  const popAudio = new Audio("./assets/audio/pop.mp3");
  popAudio.volume = 0.3;
  popAudio.play().catch((err) => {
    console.error("Pop sound failed:", err);
  });
}

// Function to play the oven-ding sound at 30% volume
function playOvenSound() {
  const ovenAudio = new Audio("./assets/audio/oven-ding.mp3");
  ovenAudio.volume = 0.3;
  ovenAudio.play().catch((err) => {
    console.error("Oven sound failed:", err);
  });
}

// Function to play Joey's audio at 10% volume
function playJoeySound() {
  const joeyAudio = document.getElementById("joey-audio");
  if (joeyAudio) {
    joeyAudio.currentTime = 0;
    joeyAudio.volume = 0.1;
    joeyAudio.play().catch((err) => {
      console.error("Joey audio playback failed:", err);
    });
  } else {
    console.error("Joey audio element not found.");
  }
}

// Function to spawn food icons and then trigger oven sound and Joey audio with subtitle
function spawnFoodIcons() {
  const container = document.getElementById("food-animation-container");
  if (!container) {
    console.error("Food animation container not found.");
    return;
  }
  const foods = ["🍕", "🌭", "🍔", "🍩", "🍟"];
  const safeMargin = 150; // Avoid very corners

  // Clear container in case previous animations remain
  container.innerHTML = "";

  // Spawn each food icon one after the other with a 300ms gap
  foods.forEach((food, index) => {
    setTimeout(() => {
      const foodEl = document.createElement("div");
      foodEl.classList.add("food-icon");
      foodEl.textContent = food;
      // Position each food icon at a random location within safe margins
      const left = Math.random() * (window.innerWidth - 2 * safeMargin) + safeMargin;
      const top = Math.random() * (window.innerHeight - 2 * safeMargin) + safeMargin;
      foodEl.style.left = left + "px";
      foodEl.style.top = top + "px";
      container.appendChild(foodEl);
      playPopSound();
      // Remove the food icon when its animation ends
      foodEl.addEventListener("animationend", () => {
        foodEl.remove();
      });
    }, index * 300);
  });

  // After all food icons have popped up, play the oven-ding sound at 30% volume
  setTimeout(() => {
    playOvenSound();
  }, foods.length * 300 + 300);

  // Then, after the oven sound, play Joey's audio and show the subtitle
  setTimeout(() => {
    playJoeySound();
    const message = document.createElement("div");
    message.classList.add("joey-message");
    message.textContent = "Joey doesn't share food";
    container.appendChild(message);
    message.addEventListener("animationend", () => {
      message.remove();
    });
  }, foods.length * 300 + 600);
}

