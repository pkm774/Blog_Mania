$(document).ready(function () {
  $.post("/savesession", { toSave: false });
  $(".form-check-input").on("click", async (event) => {
    try {
      if ($(".form-check-input").val() === "false") {
        $(".form-check-input").attr("value", "true");
        //$('.save-user')[0].setAttribute('checked', '');
      } else {
        $(".form-check-input").attr("value", "false");
        //$('.save-user').removeAttr('checked');
      }

      let saveUser = $(".form-check-input").val();
      $.post("/savesession", { toSave: saveUser });
    } catch (error) {
      console.log(`Client: Error in loading blog view page: ${error}`);
    }
  });
});
