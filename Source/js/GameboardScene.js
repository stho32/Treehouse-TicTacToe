/* The Gameboard: Two players & game state
as well as UI interaction.
*/
function GameboardScene() {
    /* Safe place for the scene manager in this very complex scene ... */
    let SceneManager = undefined;

    /* Main DOM Element */
    const $board = $("#board");

    /* I declare everything that can be called and used from outside
    as "publicApi". This way I can not only return it to the main 
    thread, I can pass it to dependencies, too. 
    I need that ability to separate PlayerInteractions with the board
    into there on "class-resembling"-functions.
    */
    let publicApi = {};
    publicApi.PlayerO = Player(1, "O", "human", "screen-win-one");
    publicApi.PlayerX = Player(2, "X", "human", "screen-win-two");
    publicApi.ActivePlayer = publicApi.PlayerO;
    /* --- */

    publicApi.SetPlayer1 = (name, type) => {
        publicApi.PlayerO.Name = name;
        publicApi.PlayerO.PlayerType = type;
    };

    publicApi.SetPlayer2 = (name, type) => {
        publicApi.PlayerX.Name = name;
        publicApi.PlayerX.PlayerType = type;        
    };

    /* Activate the "activePlayer", deactivate the other one */
    function performPlayerActivation() {
        publicApi.PlayerO.setActive(publicApi.ActivePlayer.Sign === "O");
        publicApi.PlayerX.setActive(publicApi.ActivePlayer.Sign === "X");

        ExecutePlayerInteraction(publicApi.ActivePlayer, publicApi);
    }

    /* External components (player interaction models) use this
    function to continue with the rest of the game flow.
    */
    publicApi.ContinueGameplay = () => {
        /* Do we have a winner? */
        let winner = publicApi.WhoIsTheWinner();

        let finalScreenScene = SceneManager.GetSceneApi("FinalScreen");

        if (winner !== false) {

            finalScreenScene.SetTextAndCssClass("Winner", winner.WinCssClass, winner.Name);
            SceneManager.ShowScene("FinalScreen");

            return;
        } 

        if (publicApi.AreAllBoxesFilled()) {

            finalScreenScene.SetTextAndCssClass("It's a Tie!", "screen-win-tie");
            SceneManager.ShowScene("FinalScreen");

            return;
        }

        /* No? Then continue with the next player... */
        publicApi.NextPlayer();
    }

    /* Activate the next player .. */
    publicApi.NextPlayer = () => {
        if (publicApi.ActivePlayer.Sign === "X") {
            publicApi.ActivePlayer = publicApi.PlayerO;
        } else {
            publicApi.ActivePlayer = publicApi.PlayerX;
        }

        performPlayerActivation();
    };

    /* Place the sign of the currently active player 
    at the given position. 
    */
    publicApi.PlaceSignAtPosition = (row, column) => {
        let boxes = $board.find(".box");
        let position = 3 * (row - 1) + (column - 1);
        $(boxes[position]).addClass(publicApi.ActivePlayer.PlayerSignCssClass);
    };

    /* Clear the board */
    publicApi.Clear = () => {

        let boxes = $board.find(".box");

        boxes.each((index, box) => {
            // Remove all set signs
            $(box).removeClass(publicApi.PlayerO.PlayerSignCssClass);
            $(box).removeClass(publicApi.PlayerX.PlayerSignCssClass);

            // Remove all effects
            $(box).removeClass(publicApi.PlayerO.HoverEffectCssClass);
            $(box).removeClass(publicApi.PlayerX.HoverEffectCssClass);

            // And in case we still have some event handlers
            // lurking around, shut them down.
            $(box).off("click");
        });

        // Reset to default player
        publicApi.PlayerO.setActive(false);
        publicApi.PlayerX.setActive(false);
        publicApi.ActivePlayer = publicApi.PlayerO;
        performPlayerActivation();
    }

    /* Get all boxes that are not assigned yet */
    publicApi.GetEmptyBoxes = () => {
        return $board.find(".box:not(.box-filled-1):not(.box-filled-2)");
    }

    /* Find out if all boxes are filled. */
    publicApi.AreAllBoxesFilled = () => {
        return publicApi.GetEmptyBoxes().length === 0;
    };

    publicApi.GetBoardAsString = () => {
        let result = "";
        let boxes = $board.find(".box");

        for(let i = 0; i < boxes.length; i++ ) {
            // Box with O as O
            if ( $(boxes[i]).hasClass(publicApi.PlayerO.PlayerSignCssClass) ) {
                result += publicApi.PlayerO.Sign;
                continue;
            }
            // Box with X as X
            if ( $(boxes[i]).hasClass(publicApi.PlayerX.PlayerSignCssClass) ) {
                result += publicApi.PlayerX.Sign;
                continue;
            }
            // Empty box
            result += " ";
        }

        return result;
    }


    /* Uses a list of coordinates to validate, if there is a 
    specific css class in every selected box. Using this function
    we can check if and what part of the winning conditions
    is fulfilled. */
    function IsBoxSetComplete(boxCoordinates, expectedCssClass) {
        let complete = true;
        let boxes = $board.find(".box");

        boxCoordinates.forEach(coordinate => {
            let coordinateAsIndex = (coordinate.row-1) * 3 + (coordinate.column-1);
            complete = complete && $(boxes[coordinateAsIndex]).hasClass(expectedCssClass);
        });

        return complete;
    }

    /* Detect if the given player has won. */
    function playerHasWon(player) {
        let signCssClass = player.PlayerSignCssClass;

        // the 3 rows
        if (IsBoxSetComplete([{ row: 1, column: 1 }, { row: 1, column: 2 }, { row: 1, column: 3 }], signCssClass)) return true;
        if (IsBoxSetComplete([{ row: 2, column: 1 }, { row: 2, column: 2 }, { row: 2, column: 3 }], signCssClass)) return true;
        if (IsBoxSetComplete([{ row: 3, column: 1 }, { row: 3, column: 2 }, { row: 3, column: 3 }], signCssClass)) return true;

        // the 3 columns
        if (IsBoxSetComplete([{ row: 1, column: 1 }, { row: 2, column: 1 }, { row: 3, column: 1 }], signCssClass)) return true;
        if (IsBoxSetComplete([{ row: 1, column: 2 }, { row: 2, column: 2 }, { row: 3, column: 2 }], signCssClass)) return true;
        if (IsBoxSetComplete([{ row: 1, column: 3 }, { row: 2, column: 3 }, { row: 3, column: 3 }], signCssClass)) return true;

        // the 2 diagonals
        if (IsBoxSetComplete([{ row: 1, column: 1 }, { row: 2, column: 2 }, { row: 3, column: 3 }], signCssClass)) return true;
        if (IsBoxSetComplete([{ row: 1, column: 3 }, { row: 2, column: 2 }, { row: 3, column: 1 }], signCssClass)) return true;

        return false;
    }

    /* Find out if the "win" condition is met and if, for whom. 
    @returns: the winner or false
    */
    publicApi.WhoIsTheWinner = () => {

        if (playerHasWon(publicApi.PlayerX)) return publicApi.PlayerX;
        if (playerHasWon(publicApi.PlayerO)) return publicApi.PlayerO;

        return false;
    };


    /* Bootstrapping of the gameboard */
    publicApi.Run = (sceneManager) => {
        SceneManager = sceneManager;
        publicApi.Clear();
    }

    /* ---- */

    return publicApi;
}

SceneManager.RegisterScene({ Name: "Gameboard", $DomElement : $("#board"), SceneApi : GameboardScene() });
