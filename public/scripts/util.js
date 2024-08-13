$("#blogButton").on('click', async (event) => {
    event.preventDefault();

    // Get blog text
    let blogData = $("#inputBox").val();

    if ((blogData.length > 0) && event.type === 'click') {
        // Send blog text
        $.post('/save', { blogText: blogData });
        alert('Your Blog has been saved successfully!');
    } else {
        alert('Please write something to post!');
    }
});