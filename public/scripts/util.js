// Create Blog using POST
// 'id' Selector for single button
$(document).ready(function () {
    const toolbarOptions = [
        ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
        ['blockquote', 'code-block'],
        ['link', 'image', 'video', 'formula'],
        [{ 'header': 1 }, { 'header': 2 }],               // custom button values
        [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'list': 'check' }],
        [{ 'script': 'sub' }, { 'script': 'super' }],      // superscript/subscript
        [{ 'indent': '-1' }, { 'indent': '+1' }],          // outdent/indent
        [{ 'direction': 'rtl' }],                         // text direction
        [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
        [{ 'font': [] }],
        [{ 'align': [] }],
        ['clean']                                         // remove formatting button
    ];

    var quill = new Quill('#editor', {
        theme: 'snow',
        placeholder: 'Blog Content',
        modules: {
            syntax: true,
            toolbar: toolbarOptions
        },
    });

    // Add a custom handler for the link button
    quill.getModule('toolbar').addHandler('link', function () {
        const href = prompt('Enter the link URL');
        if (href) {
            // Prepend 'http://' if the URL doesn't include a protocol
            const fullUrl = /^https?:\/\//i.test(href) ? href : 'http://' + href;
            const range = this.quill.getSelection();
            if (range) {
                this.quill.formatText(range.index, range.length, 'link', fullUrl);
            }
        }
    });

    $("#saveButton").on('click', async (event) => {
        event.preventDefault();

        let bloggerName = $("#nameInputBox").val();
        let bloggingTitle = $("#titleInputBox").val();
        let bloggingData = quill.root.innerHTML;  // Get the HTML content from Quill

        // Function to check for forbidden characters
        function containsForbiddenChars(value) {
            // check for '..' '/' '\'
            const forbiddenChars = /(\.\.|\/|\\)/;
            return forbiddenChars.test(value);
        }

        // Validate bloggerName for forbidden characters
        if (containsForbiddenChars(bloggerName)) {
            alert("Unsupported characters in blogger name!");
            return;
        }

        if (!bloggingTitle && !bloggingData && !bloggerName) {
            alert("Create a Blog to save !");
            return;
        } else if (!bloggingTitle) {
            alert("Blog title is required !");
            return;
        } else if (!bloggingData) {
            alert("Blog should not be empty !");
            return;
        } else if (!bloggerName) {
            alert("Author name is required !");
            return;
        }

        let data = {
            name: bloggerName,
            title: bloggingTitle,
            blog: bloggingData
        };

        $.post('/save', data)
            .done((data, textStatus, jqXHR) => {
                if (jqXHR.status === 201) {
                    alert('Blog post created successfully');
                    window.location.reload(false);
                }
            })
            .fail((jqXHR, textStatus, errorThrown) => {
                console.error('Error creating blog post:', errorThrown);
            });
    });

    // Append Blog using POST
    // 'id' Selector for single button
    $("#appendButton").on('click', async (event) => {
        event.preventDefault();

        let bloggingTitle = $("#formControlInput2").val();
        let bloggingBody = quill.root.innerHTML;

        if (bloggingBody === 'NaN' || bloggingTitle === 'NaN' || (bloggingBody === 'NaN' && bloggingTitle === 'NaN')) {
            alert("Redirecting to BLOG page again");
            window.location.href = '/blogs';
            return;
        } else if (!bloggingBody || !bloggingTitle || (!bloggingBody && !bloggingTitle)) {
            alert("Input Fields are Empty !");
            window.location.href = '/blogs';
            return;
        }

        let data = {
            title: bloggingTitle,
            blog: bloggingBody
        };

        if (event.type === 'click' && bloggingBody) {
            // Get the clicked button's ID
            const blogId = $("#appendButton").attr('blogId');

            // Send blog text
            let url = `/append?blogId=${blogId}`;

            $.ajax({
                url: url,
                type: 'PATCH',
                data: JSON.stringify(data),
                contentType: 'application/json',
                success: function (data, textStatus, jqXHR) {
                    if (jqXHR.status === 200) {
                        alert('Client: Blog post updated successfully');
                        window.location.href = '/blogs';
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    console.error('Client: Error updating blog post:', errorThrown);
                }
            });
        }
    });
});
/*$("#saveButton").on('click', async (event) => {
    event.preventDefault();

    // Get blog text
    let bloggerName = $("#nameInputBox").val();
    let bloggingTittle = $("#titleInputBox").val();
    let bloggingData = $("#blogInputBox").val();

    // Function to check for forbidden characters
    function containsForbiddenChars(value) {
        // check for '..' '/' '\'
        const forbiddenChars = /(\.\.|\/|\\)/;
        return forbiddenChars.test(value);
    }

    // Validate bloggerName for forbidden characters
    if (containsForbiddenChars(bloggerName)) {
        alert("Unsupported characters in blogger name!");
        return;
    }

    if (!bloggerName && !bloggerName && !bloggingData) {
        alert("Create a Blog to save !");
        return;
    } else if (!bloggingTittle) {
        alert("Blog title is required !");
        return;
    } else if (!bloggingData) {
        alert("Blog should not be empty !");
        return;
    } else if (!bloggerName) {
        alert("Author name is required !");
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
                    alert('Client: Blog post created successfully', data);
                    // Refresh the page
                    // true for a complete server refresh
                    window.location.reload(false);
                }
            })
            .fail((jqXHR, textStatus, errorThrown) => {
                console.error('Client: Error creating blog post:', errorThrown);
            });
    }
});*/