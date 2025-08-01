// ─── Custom-range globals ──────────────────────────────
let customStart = moment().startOf('month');  // initial default
let customEnd   = moment();

$('#customDateRange').daterangepicker(
  {
    opens  : 'right',
    locale : { format: 'YYYY-MM-DD' },
    startDate: customStart,
    endDate  : customEnd
  },
  (start, end) => {
    customStart = start.clone();
    customEnd   = end.clone();
    calculateStatsAndPopulateTable();   // refresh tables
  }
);

// Function to open the modal and populate the dropdowns
async function openAddPlayModal() {
  const gameSelect = document.getElementById("gameSelection");

  try {
    // Clear previous game selection and reset validation
    gameSelect.innerHTML = '<option value="">Select a game...</option>';
    $(gameSelect).next(".select2-container").removeClass("select2-invalid");

    function resetValidationStates() {
      // Clear invalid states for all inputs
      document.querySelectorAll(`.${invalidInputClass}`).forEach((element) => {
        element.classList.remove(invalidInputClass);
      });

      // Clear invalid state for Select2 game selection
      const gameSelectContainer =
        $("#gameSelection").next(".select2-container");
      gameSelectContainer.removeClass("select2-invalid");
    }

    // Then, in your openAddPlayModal function, before showing the modal:
    resetValidationStates();

    // Fetch games and populate the dropdown
    const gamesSnapshot = await firebase.firestore().collection("games").get();
    let gamesArray = gamesSnapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
    }));

    // Sort games by name
    gamesArray.sort((a, b) => a.name.localeCompare(b.name));

    // Append sorted games to the select element
    gamesArray.forEach((game) => {
      let option = document.createElement("option");
      option.value = game.id;
      option.textContent = game.name;
      gameSelect.appendChild(option);
    });

    // Initialize Select2 for game selection
    if ($.fn.select2 && gameSelect) {
      $(gameSelect).select2({
        placeholder: "Select a game...",
        allowClear: true,
      });
    }

    // Set current date and time for the datetime input
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    const localDateTime = new Date(now - timezoneOffset)
      .toISOString()
      .slice(0, 16);
    document.getElementById("playDateTime").value = localDateTime;

    // Fetch and populate players dropdown
    const playerSelect = document.querySelector(".player-dropdown"); // Ensure this selector matches your initial player dropdown
    if (playerSelect) {
      await populatePlayerDropdown(playerSelect); // Make sure this is awaited before showing the modal
      if (playerSelect) {
        playerSelect.addEventListener('change', updateAllPlayerDropdowns);
        updateAllPlayerDropdowns();        // bring every list in sync right away
      }
    }

    // Show the modal
    new bootstrap.Modal(document.getElementById("addPlayModal")).show();
  } catch (error) {
    console.error("Error opening modal: ", error);
  }
}

// Function to calculate stats and populate the table
async function calculateStatsAndPopulateTable() {
  try {
    // Grab the selected date range
    const dateRange = document.getElementById("dateRange").value;

    // Define the date range based on the selection
    let startDate, endDate;
    const now = new Date();
    switch (dateRange) {
      case "currentMonth":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "previousMonth":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "yearToDate":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = now;
        break;
      case "previousYear":
        const lastYear = now.getFullYear() - 1;
        startDate = new Date(lastYear, 0, 1);          // Jan 1 of last year
        endDate = new Date(lastYear, 11, 31, 23, 59, 59, 999); // Dec 31 23:59:59
        break;
      case "custom":
        startDate = customStart.toDate();
        endDate   = customEnd.toDate();
        break;
    }

    // Convert dates to Firestore timestamps
    const startTimestamp = firebase.firestore.Timestamp.fromDate(startDate);
    const endTimestamp = firebase.firestore.Timestamp.fromDate(endDate);

    // Grab the list of players
    const playersSnapshot = await firebase.firestore().collection("players").get();
    const playerStats = {};
    const playerNames = {}; // Dictionary to map player IDs to names
    const gameStats = {};

    // Initialize stats for each player and create the playerNames dictionary
    playersSnapshot.forEach((doc) => {
      const playerId = doc.id;
      const playerName = doc.data().name;
      playerNames[playerId] = playerName; // Map player ID to name
      playerStats[playerId] = {
        name: playerName,
        wins: 0,
        plays: 0,
        playersDefeated: 0,
        weightedWins: 0,
      };
    });

    // Grab all the games data for easy access.
    const gamesSnapshot = await firebase.firestore().collection("games").get();
    const gamesData = {};
    gamesSnapshot.forEach((doc) => {
      gamesData[doc.id] = doc.data();
    });

    // Fetch plays within the date range
    const playsSnapshot = await firebase.firestore()
      .collection("plays")
      .where("dateTime", ">=", startTimestamp)
      .where("dateTime", "<=", endTimestamp)
      .get();

    const gamesSummary = [];

    playsSnapshot.forEach((playDoc) => {
      const playData = playDoc.data();
      const gameId = playData.game;

      // Initialize stats object for this game if not already done
      if (!gameStats[gameId]) {
        gameStats[gameId] = {
          plays: 0,
          name: gamesData[gameId].name,
          playerWins: {},
          bestScore: gamesData[gameId].best_score || "N/A",
        };
      }

      // Update game stats
      gameStats[gameId].name = gamesData[gameId].name;
      gameStats[gameId].plays += 1;

      let gameInfo = {};

      const gameMonth = playData.dateTime.toDate().toLocaleString("default", { month: "short" });
      const gameDay = playData.dateTime.toDate().getDate();
      gameInfo["date"] = `${gameMonth} ${gameDay}`;
      gameInfo["name"] = gamesData[playData.game].name;
      gameInfo["players"] = [];
      gameInfo["playDocId"] = playDoc.id; // Store the document ID for deletion
      gameInfo["gameId"] = gameId; // Store the game ID for best score recalculation

      let maxRank = 0;
      let loserName = "";

      playData.players.forEach((player) => {
        if (player.rank === 1) { // Check if the player won
          if (!gameStats[gameId].playerWins[player.player]) {
            gameStats[gameId].playerWins[player.player] = 0;
          }
          gameStats[gameId].playerWins[player.player] += 1;
        }

        if (player && playerStats[player.player]) {
          playerStats[player.player].plays++;
          playerStats[player.player].playersDefeated += player.players_beaten || 0;

          gameInfo["players"].push(playerStats[player.player].name);

          if (player.rank === 1) {
            playerStats[player.player].wins++;
            gameInfo["winner"] = playerStats[player.player].name;
            gameInfo["winningScore"] = player.score == null ? "N/A" : player.score;

            // Calculate weighted wins
            const gameTier = gamesData[playData.game].tier;
            const winMultiplier = gameTier === "light" ? 0.5 : gameTier === "medium" ? 1 : 1.5;
            playerStats[player.player].weightedWins = (playerStats[player.player].weightedWins || 0) + winMultiplier;
          }

          if (player.rank > maxRank) {
            maxRank = player.rank;
            loserName = playerStats[player.player].name;
          }
        }
      });

      // Add winner/loser to gameInfo
      if (gameInfo["winner"]) {
        gameInfo["winner"] = `${gameInfo["winner"]}/${loserName}`;
      } else {
        gameInfo["winner"] = `N/A / ${loserName}`;
      }

      gamesSummary.unshift(gameInfo);
    });

    // Filter out players with no plays
    const filteredPlayerStats = Object.values(playerStats).filter(player => player.plays > 0);

    // Calculate win percentage and update the stats object
    filteredPlayerStats.forEach((player) => {
      player.winPercentage = player.plays > 0 ? Math.round((player.wins / player.plays) * 100) : 0;
      player.weightedWins = player.weightedWins.toFixed(1);
    });

    populateTable(filteredPlayerStats); // Use filtered stats
    populateGamesSummaryTable(gamesSummary);
    populateGameStatsTable(gameStats, playerNames); // Pass player names dictionary
  } catch (error) {
    console.error("Error calculating stats: ", error);
    document.getElementById("loadingIndicator").innerHTML =
      '<td colspan="6" class="text-center">Failed to load data. Please try again later.</td>';
  }
}

// Function to populate the player stats table
function populateTable(playerStats) {
  // Get the table body element and loading indicator
  const playerStatsTableBody = document.querySelector("#stats-table tbody");
  const loadingIndicator = document.getElementById("loadingIndicator");

  // Hide the loading indicator
  if (loadingIndicator) {
    loadingIndicator.style.display = "none";
  }

  // Destroy the current DataTable instance if it exists
  if ($.fn.DataTable.isDataTable("#stats-table")) {
    $("#stats-table").DataTable().clear().destroy();
  }

  // Clear the current table body
  playerStatsTableBody.innerHTML = "";

  // Populate the table body with new data
  Object.values(playerStats).forEach((player) => {
    // Make player names more compact on mobile
    const playerName = window.innerWidth <= 576 
      ? truncateForMobile(player.name, 8) 
      : player.name;
    
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${playerName}</td>
      <td>${player.wins}</td>
      <td>${player.plays}</td>
      <td>${player.winPercentage}%</td>
      <td>${player.playersDefeated}</td>
      <td>${player.weightedWins || 0}</td>
    `;
    playerStatsTableBody.appendChild(row);
  });

  // Reinitialize the DataTable with the new data and configuration
  $("#stats-table").DataTable({
    paging: false, // or true if you want pagination
    info: false, // or true if you want the info section
    searching: false, // or true if you want search functionality
    order: [[1, "desc"]],
    columnDefs: [{ orderable: false, targets: 0 }],
  });
}

// Function to populate the recently played games table
function populateGamesSummaryTable(gamesData) {
  const tableBody = document.querySelector("#games-summary-table tbody");
  const loadingIndicatorGames = document.getElementById(
    "loadingIndicatorGames"
  );

  // Hide the loading indicator
  if (loadingIndicatorGames) {
    loadingIndicatorGames.style.display = "none";
  }

  // Clear the table before populating it
  tableBody.innerHTML = "";

  gamesData.forEach((game) => {
    // Make player list more compact on mobile
    const playerList = window.innerWidth <= 576 
      ? game.players.map(p => truncateForMobile(p, 6)).join(",") 
      : game.players.join(", ");
    
    // Make game names more compact on mobile  
    const gameName = window.innerWidth <= 576 
      ? truncateForMobile(game.name, 8) 
      : game.name;
    
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${game.date}</td>  
      <td>${gameName}</td>
      <td class="winner-info">${game.winner}</td>
      <td>${game.winningScore}</td>
      <td>${playerList}</td>
      <td>
        <button class="btn btn-danger btn-sm delete-play-btn" data-play-id="${game.playDocId}" data-game-id="${game.gameId}" title="Delete this play">
          🗑️
        </button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

function populateGameStatsTable(gameStats, playerNames) {
  const tableBody = document.querySelector("#games-played-table tbody");
  const loadingIndicatorGames = document.getElementById("loadingIndicatorGames");

  if (loadingIndicatorGames) {
    loadingIndicatorGames.style.display = "none";
  }

  tableBody.innerHTML = "";

  const gamesArray = Object.values(gameStats);

  gamesArray.sort((a, b) => {
    return b.plays - a.plays;
  });

  gamesArray.forEach((game) => {
    // Sort playerWins first by the number of wins (descending) and then by player name (ascending)
    const sortedPlayerWins = Object.entries(game.playerWins)
      .sort(([playerIdA, winsA], [playerIdB, winsB]) => {
        if (winsB === winsA) {
          return playerNames[playerIdA].localeCompare(playerNames[playerIdB]);
        }
        return winsB - winsA;
      })
      .map(([playerId, wins]) => {
        const playerName = window.innerWidth <= 576 
          ? truncateForMobile(playerNames[playerId], 5) 
          : playerNames[playerId];
        return `${playerName}:${wins}`;
      })
      .join(window.innerWidth <= 576 ? "," : ", ");

    // Make game names more compact on mobile
    const gameName = window.innerWidth <= 576 
      ? truncateForMobile(game.name, 8) 
      : game.name;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${gameName}</td>
      <td>${game.plays}</td>
      <td>${sortedPlayerWins}</td>
      <td>${game.bestScore}</td>
    `;
    tableBody.appendChild(row);
  });
}

// Define a function to initialize Select2
function initializeSelect2() {
  $("#gameSelection").select2({
    width: "100%", // This makes the dropdown match the width of its container
    placeholder: "Select a game...",
    allowClear: true,
  });
}

// Function to add new player entry form
async function addPlayerEntry() {
  const playerEntriesContainer = document.getElementById(
    "player-entries-container"
  );

  // Count the current number of player entries to set the default rank
  const numberOfEntries =
    playerEntriesContainer.getElementsByClassName("player-entry").length;

  // Create a new player entry div
  const newEntryDiv = document.createElement("div");
  newEntryDiv.classList.add(
    "player-entry",
    "d-flex",
    "align-items-end",
    "mb-2"
  ); // Added mb-2 for spacing between entries

  // Player Dropdown
  const playerSelect = document.createElement("select");
  playerSelect.classList.add("form-control", "player-dropdown", "mr-2");
  playerSelect.name = "player";
  // Set the default option
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Player...";
  defaultOption.disabled = true; // Optional: make it disabled
  defaultOption.selected = true;
  playerSelect.appendChild(defaultOption);
  newEntryDiv.appendChild(playerSelect);

  // Rank Input
  const rankInput = document.createElement("input");
  rankInput.type = "number";
  rankInput.classList.add("form-control", "rank-input", "mr-2");
  rankInput.name = "rank";
  rankInput.placeholder = "Rank";
  newEntryDiv.appendChild(rankInput);

  // Score Input
  const scoreInput = document.createElement("input");
  scoreInput.type = "number";
  scoreInput.classList.add("form-control", "score-input", "mr-2");
  scoreInput.name = "score";
  scoreInput.placeholder = "Score";
  newEntryDiv.appendChild(scoreInput);

  // Remove Button
  const removeButton = document.createElement("button");
  removeButton.innerText = "-";
  removeButton.classList.add(
    "btn",
    "btn-danger",
    "remove-player-entry",
    "ml-2"
  );
  removeButton.onclick = function () {
    this.parentElement.remove();
    updateAllPlayerDropdowns();     // refresh after deletion
  };
  newEntryDiv.appendChild(removeButton);

  // Append player entry to the main container
  playerEntriesContainer.appendChild(newEntryDiv);

    // Populate the dropdown
  await populatePlayerDropdown(playerSelect);

  // ⬇️ fire the uniqueness logic for the new dropdown
  playerSelect.addEventListener('change', updateAllPlayerDropdowns);
  updateAllPlayerDropdowns();           // make sure it’s up-to-date

  // Set defaults
  rankInput.value = numberOfEntries + 1;
  scoreInput.value = "";
}

// Function to populate player dropdown
async function populatePlayerDropdown(dropdownElement) {
  // Clear the current options
  $(dropdownElement).empty().append(new Option("Player...", ""));

  try {
    const selectedIds = getSelectedPlayerIds();
    const currentValue = dropdownElement.value;
    
    const playersSnapshot = await firebase
      .firestore()
      .collection("players")
      .orderBy("name")
      .get();
    
    playersSnapshot.forEach((doc) => {
      const playerId = doc.id;
      // Only add the player if they're not selected in another dropdown
      // or if this is the dropdown where they're currently selected
      if (!selectedIds.has(playerId) || playerId === currentValue) {
        const option = new Option(doc.data().name, playerId);
        $(dropdownElement).append(option);
      }
    });
    
    // Restore the current selection if it exists
    if (currentValue) {
      dropdownElement.value = currentValue;
    }
  } catch (error) {
    console.error("Error fetching players: ", error);
  }
}

// Return a Set of all players already chosen in any dropdown
function getSelectedPlayerIds() {
  const ids = new Set();
  document.querySelectorAll('.player-dropdown').forEach(dd => {
    if (dd.value) ids.add(dd.value);
  });
  return ids;
}

// Disable (and hide) players that are already selected elsewhere
function updateAllPlayerDropdowns() {
  const taken = getSelectedPlayerIds();

  document.querySelectorAll('.player-dropdown').forEach(dd => {
    const current = dd.value;                           // keep its own choice enabled
    Array.from(dd.options).forEach(opt => {
      if (!opt.value) return;                           // skip “Player…”
      const inUse = taken.has(opt.value) && opt.value !== current;
      opt.disabled = inUse;
      opt.hidden   = inUse;                             // keeps the list tidy
    });
  });
}

// Function to add event listeners to all remove buttons
function addRemoveButtonListeners() {
  document.querySelectorAll(".remove-player-entry").forEach((button) => {
    button.addEventListener("click", function () {
      this.parentElement.remove();
    });
  });
}

// Function to handle saving play data
async function savePlay() {
  // If validation fails, stop the function
  if (!validatePlayForm()) {
    return;
  }

  const gameSelect = document.getElementById("gameSelection");
  const playDateTime = document.getElementById("playDateTime").value;
  const playerEntries = document.querySelectorAll(".player-entry");

  // Convert the date string to a Firestore timestamp
  const playTimestamp = firebase.firestore.Timestamp.fromDate(
    new Date(playDateTime)
  );

  let playData = {
    game: gameSelect.value,
    dateTime: playTimestamp, // Use the converted timestamp
    players: [],
  };

  // Collect all player ranks in an array
  const playerRanks = Array.from(playerEntries).map((entry) => {
    const rankInput = entry.querySelector(".rank-input");
    return rankInput.value ? parseInt(rankInput.value) : null;
  });

  playerEntries.forEach((entry, index) => {
    const playerSelect = entry.querySelector(".player-dropdown");
    const scoreInput = entry.querySelector(".score-input");

    if (playerSelect.value) {
      // Count players beaten (players with a higher rank)
      const playersBeaten = playerRanks.filter(
        (rank) => rank > playerRanks[index]
      ).length;

      let playerData = {
        player: playerSelect.value,
        rank: playerRanks[index],
        score: scoreInput.value ? parseInt(scoreInput.value) : null,
        players_beaten: playersBeaten, // Add players beaten count
      };

      playData.players.push(playerData);
    }
  });

  try {
    const docRef = await firebase.firestore().collection("plays").add(playData);
    console.log("Document written with ID: ", docRef.id);

    // Fetch the game data to check the current best score
    const gameDoc = await firebase.firestore().collection("games").doc(playData.game).get();
    const gameData = gameDoc.data();
    const hiScoreWins = gameData.hi_score_wins;
    let bestScoreString = gameData.best_score;
    let bestScore = null;
    if (bestScoreString) {
      const bestScoreParts = bestScoreString.split(':');
      bestScore = parseInt(bestScoreParts[1]);
    }
    let isNewBestScore = false;
    let newBestScoreString = '';

    // Fetch player names
    const playerNames = {};
    const playersSnapshot = await firebase.firestore().collection("players").get();
    playersSnapshot.forEach((doc) => {
      playerNames[doc.id] = doc.data().name;
    });
  

    // Determine the new best score based on the game type (high score wins or low score wins)
    playData.players.forEach((player) => {
      if (player.score !== null) {
        if (
          (hiScoreWins && (bestScore === null || player.score > bestScore)) ||
          (!hiScoreWins && (bestScore === null || player.score < bestScore))
        ) {
          bestScore = player.score;
          isNewBestScore = true;
          newBestScoreString = `${playerNames[player.player]}:${player.score}`;
        }
      }
    });

    // Update the best score in the games collection if a new best score is found
    if (isNewBestScore) {
      await firebase.firestore().collection("games").doc(playData.game).update({
        best_score: newBestScoreString,
      });
    }

    // Close the modal and remove the backdrop
    $("#addPlayModal").modal("hide");
    $(".modal-backdrop").remove();
    $("body").removeClass("modal-open");

    // Reset the form
    document.getElementById("newPlayForm").reset();

    // Clear the initial player entry dropdown
    const initialPlayerSelect = document.querySelector(".player-dropdown");
    await populatePlayerDropdown(initialPlayerSelect);

    // Clear all additional player entries
    const playerEntriesContainer = document.getElementById(
      "player-entries-container"
    );
    playerEntriesContainer.innerHTML = "";

    // Add back one empty player entry form
    await addPlayerEntry();

    // Update the table
    await calculateStatsAndPopulateTable();
  } catch (error) {
    console.error("Error adding document: ", error);
  }
}

// CSS class for invalid input
const invalidInputClass = "is-invalid"; // Bootstrap's class for invalid input or define your own

// Function to validate the form fields and highlight invalid inputs
function validatePlayForm() {
  let isValid = true;

  // Select elements and containers
  const gameSelectElement = $("#gameSelection");
  const gameSelectContainer = gameSelectElement.next(".select2-container");
  const playDateTimeElement = document.getElementById("playDateTime");
  const playerEntries = document.querySelectorAll(".player-entry");

  // CSS class for invalid input
  const invalidInputClass = "is-invalid"; // Bootstrap's class for invalid input or define your own

  // Helper function to toggle validation styling for Select2
  function toggleSelect2Validation(element, container, isInvalid) {
    if (isInvalid) {
      container.addClass("select2-invalid");
      isValid = false;
    } else {
      container.removeClass("select2-invalid");
    }
  }

  // Validate game selection (Select2)
  if (!gameSelectElement.val()) {
    toggleSelect2Validation(gameSelectElement, gameSelectContainer, true);
  } else {
    toggleSelect2Validation(gameSelectElement, gameSelectContainer, false);
  }

  // Helper function to add/remove invalid class for standard inputs
  function toggleInvalidInput(element, isInvalid) {
    if (isInvalid) {
      element.classList.add(invalidInputClass);
      isValid = false;
    } else {
      element.classList.remove(invalidInputClass);
    }
  }

  // Check if date is selected
  toggleInvalidInput(playDateTimeElement, !playDateTimeElement.value);

  // Check player dropdowns and ranks
  playerEntries.forEach((entry) => {
    const playerDropdown = entry.querySelector(".player-dropdown");
    const rankInput = entry.querySelector(".rank-input");

    // Check if player is selected (standard dropdown)
    toggleInvalidInput(playerDropdown, !playerDropdown.value);

    // Check if rank is entered
    toggleInvalidInput(rankInput, !rankInput.value);
  });

  return isValid;
}

// Event listener for the '+' button to add a new player entry
document
  .getElementById("add-player-button")
  .addEventListener("click", async function () {
    await addPlayerEntry();
    addRemoveButtonListeners(); // Call this function after adding a new player entry
  });

// Attach event listener for the 'savePlay' button
document.getElementById("savePlay").addEventListener("click", savePlay);

// Add event listeners to remove the invalid class when the user corrects the input
$("#gameSelection").on("select2:select", function () {
  $(this).next(".select2-container").removeClass("select2-invalid");
});

// Add listener for when someone changes the date range
document.getElementById("playDateTime").addEventListener("change", function () {
  this.classList.remove(invalidInputClass);
});

// Update the event listener for player dropdown changes
document.addEventListener('change', function(e) {
  if (e.target.classList.contains('player-dropdown')) {
    e.target.classList.remove(invalidInputClass);
    updateAllPlayerDropdowns();
  }
});

// "Save New Game" Modal button listener
document
  .getElementById("saveGame")
  .addEventListener("click", async function () {
    const gameName = document.getElementById("gameNameInput").value;
    const gameTier = document.getElementById("gameTierSelect").value;
    const hiScoreWins = document.getElementById("hiScoreWinsCheck").checked;

    let isValid = true;

    // Clear previous invalid states
    gameNameInput.classList.remove("is-invalid");
    gameTierSelect.classList.remove("is-invalid");

    // Basic validation
    if (!gameNameInput.value.trim()) {
      gameNameInput.classList.add("is-invalid");
      isValid = false;
    }
    if (!gameTierSelect.value) {
      gameTierSelect.classList.add("is-invalid");
      isValid = false;
    }

    // Stop the function if validation fails
    if (!isValid) {
      return;
    }

    try {
      // Add a new document in collection "games"
      const docRef = await firebase.firestore().collection("games").add({
        name: gameName,
        tier: gameTier,
        hi_score_wins: hiScoreWins,
      });
      console.log("Game written with ID: ", docRef.id);

      // Close the modal
      $("#addGameModal").modal("hide");

      // Reset the form fields
      document.getElementById("newGameForm").reset();

      // If you're using checkboxes and want to ensure they're unchecked
      document.getElementById("hiScoreWinsCheck").checked = false;
    } catch (error) {
      console.error("Error adding game: ", error);
    }
  });

// Function to populate the player checkboxes
async function populatePlayerCheckboxes() {
  const checkboxesContainer = document.getElementById('playerCheckboxes');
  checkboxesContainer.innerHTML = ''; // Clear any existing checkboxes

  try {
      const playersSnapshot = await firebase.firestore().collection('players').orderBy('name').get();
      playersSnapshot.forEach((doc) => {
          const playerData = doc.data();
          const playerName = playerData.name;
          const playerId = doc.id;
          const isRegular = playerData.regular;

          // Create a checkbox element
          const checkboxDiv = document.createElement('div');
          checkboxDiv.classList.add('form-check', 'mr-3');
          checkboxDiv.style.flex = '0 1 30%'; // Adjust the flex basis as needed

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.classList.add('form-check-input');
          checkbox.id = `checkbox-${playerId}`;
          checkbox.value = playerId;
          checkbox.checked = isRegular; // Default to checked if the player is a regular

          const label = document.createElement('label');
          label.classList.add('form-check-label');
          label.htmlFor = `checkbox-${playerId}`;
          label.textContent = playerName;

          checkboxDiv.appendChild(checkbox);
          checkboxDiv.appendChild(label);
          checkboxesContainer.appendChild(checkboxDiv);
      });
  } catch (error) {
      console.error('Error fetching players: ', error);
  }
}

let lastPickedPlayerId = null; // Variable to store the last picked player ID

// Function to select a random player from the checked checkboxes
function pickRandomPlayer() {
    const checkedCheckboxes = document.querySelectorAll('#playerCheckboxes .form-check-input:checked');
    const checkedPlayerIds = Array.from(checkedCheckboxes).map(checkbox => checkbox.value);

    // Exclude the last picked player from the list
    const eligiblePlayerIds = checkedPlayerIds.filter(playerId => playerId !== lastPickedPlayerId);

    if (eligiblePlayerIds.length > 0) {
        const randomPlayerId = eligiblePlayerIds[Math.floor(Math.random() * eligiblePlayerIds.length)];
        const randomPlayerName = document.querySelector(`#checkbox-${randomPlayerId}`).nextSibling.textContent;
        document.getElementById('randomPlayerName').innerText = randomPlayerName;
        lastPickedPlayerId = randomPlayerId; // Update the last picked player ID
    } else {
        document.getElementById('randomPlayerName').innerText = 'No players selected';
    }
}

// Event listener for the "Pick Another Player" button
document.getElementById('pickAnotherPlayerButton').addEventListener('click', pickRandomPlayer);

// Event listener for opening the modal to populate checkboxes
document.getElementById('startPlayerButton').addEventListener('click', async function () {
    await populatePlayerCheckboxes();
    $('#startPlayerModal').modal('show');
});
// Function to handle saving a new player
async function saveNewPlayer() {
  const playerNameInput = document.getElementById('playerNameInput');
  const regularCheck = document.getElementById('regularCheck');

  const playerName = playerNameInput.value.trim();
  const isRegular = regularCheck.checked;

  // Basic validation
  if (!playerName) {
      alert('Player name is required.');
      return;
  }

  try {
      // Add a new document in collection "players"
      await firebase.firestore().collection('players').add({
          name: playerName,
          regular: isRegular
      });

      console.log('Player added successfully.');

      // Close the modal
      $('#addPlayerModal').modal('hide');

      // Reset the form fields
      playerNameInput.value = '';
      regularCheck.checked = false;

      // Optionally, update the UI or refresh data here if needed
  } catch (error) {
      console.error('Error adding player: ', error);
  }
}

// Attach event listener for the "Save Player" button
document.getElementById('savePlayerButton').addEventListener('click', saveNewPlayer);

// Optionally, you can also add an event listener to clear form fields when the modal is shown
$('#addPlayerModal').on('shown.bs.modal', function () {
  document.getElementById('newPlayerForm').reset();
});

// Event listener for opening the modal
document.getElementById('addPlayerButton').addEventListener('click', function () {
  $('#addPlayerModal').modal('show');
});

$(document).ready(function () {
  // Attach event listener for opening the modal only if the 'addPlayButton' exists
  const addPlayButton = document.getElementById("addPlayButton");
  if (addPlayButton) {
    addPlayButton.addEventListener("click", () => {
      openAddPlayModal()
        .then(() => {
          // Initialize Select2 after opening the modal
          initializeSelect2();
        })
        .catch((error) => {
          console.error("Error opening modal: ", error);
        });
    });
  }

  // Add this event listener inside your $(document).ready function for date range changes
  $("#dateRange").on("change", function () {
    const val = this.value;
  
    if (val === 'custom') {
      $('#customDateRange').removeClass('d-none');
      $('#customDateRange').trigger('click');   // open picker right away
    } else {
      $('#customDateRange').addClass('d-none');
      calculateStatsAndPopulateTable();         // use preset
    }
  });

  // Calculate stats and populate the table
  calculateStatsAndPopulateTable().catch((error) => {
    console.error("Error initializing the table: ", error);
  });

  // Attach event listener for the "Add New Game" button
  $(document).on("click", "#addGameButton", function () {
    $("#addGameModal").modal("show");
  });

  // Delegate the event for dynamically added 'add player entry' button
  $(document).on("click", "#add-player-entry", addPlayerEntry);
});

// Function to delete a play and refresh the data
async function deletePlay(playDocId, gameId) {
  // Confirm deletion with user
  if (!confirm('Are you sure you want to delete this play? This action cannot be undone.')) {
    return;
  }

  try {
    // Get the play document before deleting to check if it had the best score
    const playDoc = await firebase.firestore().collection("plays").doc(playDocId).get();
    const playData = playDoc.data();
    
    // Delete the play document
    await firebase.firestore().collection("plays").doc(playDocId).delete();
    
    console.log("Play deleted successfully");
    
    // Check if we need to recalculate the best score for this game
    if (playData && gameId) {
      await recalculateBestScore(gameId);
    }
    
    // Refresh the tables to reflect the changes
    await calculateStatsAndPopulateTable();
    
  } catch (error) {
    console.error("Error deleting play: ", error);
    alert("Failed to delete play. Please try again.");
  }
}

// Function to recalculate the best score for a game after a play is deleted
async function recalculateBestScore(gameId) {
  try {
    // Get the game document
    const gameDoc = await firebase.firestore().collection("games").doc(gameId).get();
    const gameData = gameDoc.data();
    
    if (!gameData) {
      console.error("Game not found for ID:", gameId);
      return;
    }
    
    const hiScoreWins = gameData.hi_score_wins;
    
    // Get all remaining plays for this game
    const playsSnapshot = await firebase.firestore()
      .collection("plays")
      .where("game", "==", gameId)
      .get();
    
    let bestScore = null;
    let bestScoreString = '';
    
    // Get player names for the best score string
    const playerNames = {};
    const playersSnapshot = await firebase.firestore().collection("players").get();
    playersSnapshot.forEach((doc) => {
      playerNames[doc.id] = doc.data().name;
    });
    
    // Find the new best score
    playsSnapshot.forEach((playDoc) => {
      const playData = playDoc.data();
      playData.players.forEach((player) => {
        if (player.score !== null) {
          if (
            (hiScoreWins && (bestScore === null || player.score > bestScore)) ||
            (!hiScoreWins && (bestScore === null || player.score < bestScore))
          ) {
            bestScore = player.score;
            bestScoreString = `${playerNames[player.player]}:${player.score}`;
          }
        }
      });
    });
    
    // Update the game document with the new best score
    await firebase.firestore().collection("games").doc(gameId).update({
      best_score: bestScoreString || "N/A",
    });
    
    console.log("Best score recalculated for game:", gameId);
    
  } catch (error) {
    console.error("Error recalculating best score: ", error);
  }
}

// Event listener for delete buttons
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('delete-play-btn')) {
    const playId = e.target.getAttribute('data-play-id');
    const gameId = e.target.getAttribute('data-game-id');
    deletePlay(playId, gameId);
  }
});

// Helper function to truncate long names on mobile
function truncateForMobile(text, maxLength = 8) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 1) + '…';
}

// Helper function to make winner/loser more compact on mobile
function formatWinnerLoser(winner, loser) {
  // Check if we're on mobile by window width
  if (window.innerWidth <= 576) {
    const winnerShort = truncateForMobile(winner, 6);
    const loserShort = truncateForMobile(loser, 6);
    return `${winnerShort}/${loserShort}`;
  }
  return `${winner}/${loser}`;
}

