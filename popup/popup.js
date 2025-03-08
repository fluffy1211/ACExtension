// Get button element
const actionButton = document.getElementById("actionButton");

// Add click event listener
actionButton.addEventListener("click", function () {
  if (this.textContent === "ON") {
    this.textContent = "OFF";
    actionButton.style.backgroundColor = "red";
  } else {
    this.textContent = "ON";
    actionButton.style.backgroundColor = "green";
  }
});

// Function to be executed in the context of the active tab
function showAlert() {
  alert("Hello from my extension!");
}
