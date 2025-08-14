// Create Blog using POST
$("#createButton").on('click', async (event) => {
    event.preventDefault();

    // Get blog text
    let bloggerName = $("#nameInputBox").val();
    let bloggingTittle = $("#tittleInputBox").val();
    let bloggingData = $("#blogInputBox").val();

    if (!bloggerName && !bloggerName && !bloggingData) {
        alert("Create a Blog to save !");
        return;
    } else if (!bloggerName) {
        alert("Please write yor name !");
        return;
    } else if (!bloggingTittle) {
        alert("Please write blogging tittle !");
        return;
    } else if (!bloggingData) {
        alert("Please write your blog !");
        return;
    }

    let data = {
        name: bloggerName,
        tittle: bloggingTittle,
        blog: bloggingData
    };

    if (event.type === 'click' && bloggerName && bloggingTittle && bloggingData) {
        // Send blog text
        $.post('/save', data)
            .done((data, textStatus, jqXHR) => {
                if (jqXHR.status === 201) {
                    alert('Blog post created successfully', data);
                    // Refresh the page
                    window.location.reload(false); // true for a complete server refresh
                }
            })
            .fail((jqXHR, textStatus, errorThrown) => {
                console.error('Error creating blog post:', errorThrown);
            });
    }
});