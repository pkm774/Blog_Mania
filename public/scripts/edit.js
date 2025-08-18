$(".blogEditButton").on('click', async (event) => {
    event.preventDefault();
    if (event.type === 'click') {
        // Get the clicked button's ID
        const buttonId = event.target.id;
        // Send blog text
        let url = `/edit?postId=${buttonId}`;
        window.location.href = url;
    }
});