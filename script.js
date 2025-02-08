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
        audio.volume = 0.6; // 60% volume
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
  const popAudio = new Audio("assets/audio/pop.mp3");
  popAudio.volume = 0.6;
  popAudio.play().catch((err) => {
    console.error("Pop sound failed:", err);
  });
}

// Function to spawn food icons, show the subtitle, and animate the hand
function spawnFoodIcons() {
  const container = document.getElementById("food-animation-container");
  if (!container) {
    console.error("Food animation container not found.");
    return;
  }
  const foods = ["🍕", "🌭", "🍔", "🍩", "🍟"];
  const safeMargin = 100; // avoid edges

  // Spawn each food icon one after the other with a 0.4s gap
  foods.forEach((food, index) => {
    setTimeout(() => {
      const foodEl = document.createElement("div");
      foodEl.classList.add("food-icon");
      foodEl.textContent = food;
      // Random position within the viewport (with margins)
      const left = Math.random() * (window.innerWidth - 2 * safeMargin) + safeMargin;
      const top = Math.random() * (window.innerHeight - 2 * safeMargin) + safeMargin;
      foodEl.style.left = left + "px";
      foodEl.style.top = top + "px";
      container.appendChild(foodEl);
      playPopSound();
      // Remove the food element after its animation finishes
      foodEl.addEventListener("animationend", () => {
        foodEl.remove();
      });
    }, index * 400);
  });

  // Spawn the hand to "take" the food after the food icons have appeared
  setTimeout(() => {
    const hand = document.createElement("img");
    hand.src = "assets/images/hand.png"; // ensure this image exists
    hand.classList.add("hand-take");
    container.appendChild(hand);
    hand.addEventListener("animationend", () => {
      hand.remove();
      // Remove any remaining food icons
      container.querySelectorAll(".food-icon").forEach((icon) => icon.remove());
    });
  }, foods.length * 400 + 400);

  // Show a subtle subtitle message as a small fading line
  setTimeout(() => {
    const message = document.createElement("div");
    message.classList.add("joey-message");
    message.textContent = "Joey doesn't share food";
    container.appendChild(message);
    message.addEventListener("animationend", () => {
      message.remove();
    });
  }, 200);
}

