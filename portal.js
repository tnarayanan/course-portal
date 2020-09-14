const {shell, ipcRenderer} = require('electron')
const DataStore = require('./datastore.js')
const fs = require('fs')
const path = require('path')

var dataStore = new DataStore();
var currentCourse = undefined;
var currentCourseNumber = undefined;

function switchCourse(courseNumber) {
    console.log("setting selected course: " + courseNumber);

    if (courseNumber === undefined) {
        $('#course-name').text("");
        $('#course-number').text("Select a course...");
        $('#meeting-button').attr('data-link', "about:blank");
        dataStore.delete('lastSelectedCourse');
        updateNotesList();
        updateTodoList();
        updateTestList();
        return;
    }

    dataStore.get('lastSelectedCourse', (lsc) => {
        $('.sidebar-list-item[data-course-number="' + lsc + '"]').removeClass("active");
        $('.sidebar-list-item[data-course-number="' + courseNumber + '"]').addClass("active");
        dataStore.set('lastSelectedCourse', courseNumber);
        currentCourseNumber = courseNumber;
    })
    dataStore.get('courses.' + courseNumber, (course) => {
        currentCourse = course;
        console.log("received course: " + course);
        $('#course-name').text(course.name);
        $('#course-number').text(courseNumber);
        $('#meeting-button').attr('data-link', course.meeting_link);
        updateNotesList();
        updateTodoList();
        updateTestList();
    })
}

function updateTodoList() {
    console.log("updating list of todos");
    if (currentCourse === undefined) {
        $('#todo-list').html("Please select a course from the left...");
        return;
    }

    dataStore.get('courses.' + currentCourseNumber + '.todos', (todos) => {
        var i = 0;
        var html = "";
        // console.log(todos);
        jQuery.each(todos, (id, todo) => {
            console.log(id);
            if (i > 0) html = `<hr class="todo-divider">` + html;

            // const date = new Date(todo.date);

            html = `<div class="todo-item">
                            <input type="checkbox" class="todo-checkbox" data-id="${id}">
                            <div class="todo-text-container">
                                <p data-id="${id}">${todo.text}</p>
                                <small data-id="${id}">${todo.date}</small>
                            </div>
                            <button type="button" class="close todo-delete" data-id="${id}">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>` + html;
            i++;
        });

        if (html === "") {
            html = "No to-do items right now!"
        }

        $('#todo-list').html(html);

        $('.todo-checkbox').bind('click', function () {
            const isChecked = $(this).is(':checked');
            console.log("clicked checkbox, isChecked: " + isChecked);
            const dataId = $(this).attr('data-id');

            if (isChecked) {
                $('p[data-id=' + dataId + ']').css('text-decoration', 'line-through');
                $('small[data-id=' + dataId + ']').css('text-decoration', 'line-through');
            } else {
                $('p[data-id=' + dataId + ']').css('text-decoration', 'none');
                $('small[data-id=' + dataId + ']').css('text-decoration', 'none');
            }
        });

        $('.todo-delete').bind('click', function () {
            console.log("todo deleted");
            const dataId = $(this).attr('data-id');

            dataStore.delete('courses.' + currentCourseNumber + '.todos.' + dataId);
            updateTodoList();
        })
    });
}

function updateTestList() {
    console.log("updating list of tests");
    if (currentCourse === undefined) {
        $('#test-list').html("Please select a course from the left...");
        return;
    }

    dataStore.get('courses.' + currentCourseNumber + '.tests', (tests) => {
        var i = 0;
        var html = "";
        // console.log(tests);
        jQuery.each(tests, (id, test) => {
            console.log(id);
            if (i > 0) html += `<hr class="todo-divider">`;

            const date = new Date(test.date);
            date.setMinutes(date.getTimezoneOffset());

            html += `<div class="todo-item">
                            <div class="todo-text-container">
                                <p data-id="${id}">${test.text}</p>
                                <small data-id="${id}">${date.toDateString()}</small>
                            </div>
                            <button type="button" class="close test-delete" data-id="${id}">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>`;
            i++;
        });

        if (html === "") {
            html = "No tests right now!"
        }

        $('#test-list').html(html);

        $('.test-delete').bind('click', function () {
            console.log("test deleted");
            const dataId = $(this).attr('data-id');

            dataStore.delete('courses.' + currentCourseNumber + '.tests.' + dataId);
            updateTestList();
        })
    });
}

function updateNotesList() {
    console.log("updating notes list of current course");
    if (currentCourse === undefined) {
        $('#notes-list').html("Please select a course from the left...");
        return;
    }

    var notesDir = currentCourse.notes_folder;
    if (notesDir === undefined) {
        console.log("no notes directory set.");
        $('#notes-list').html("A notes directory has not been set.");
        return;
    }

    fs.readdir(notesDir, (err, files) => {
        var htmlStr = "";
        if (err != null) {
            htmlStr = `An error occurred while searching the notes directory. Please confirm that the following directory exists on your computer: <code>${notesDir}</code>`
        } else {
            files.forEach(file => {
                var isNote = false;
                var iconName = undefined;

                if (file.endsWith(".md") || file.endsWith(".txt")) {
                    // text file, this is a note
                    isNote = true;
                    iconName = "notes";

                } else if (file.endsWith(".doc") || file.endsWith(".docx") || file.endsWith(".pages")) {
                    // word/pages doc, this is a note
                    isNote = true;
                    iconName = "insert_drive_file"
                }

                if (isNote) {
                    var fullFilePath = path.join(notesDir, file);
                    htmlStr += `<a href="#" class="note-link" data-file="${fullFilePath}"><div style="flex-grow: 1">${file}</div><i class="material-icons" style="font-size: 36px; margin: 0; padding: 0;">${iconName}</i></a>`
                }
            });
        }

        if (htmlStr === "") {
            htmlStr = "No notes have been added."
        }

        $('#notes-list').html(htmlStr);

        $('.note-link').bind('click', function (event) {
            console.log("note clicked");
            event.preventDefault();
            var file = this.getAttribute('data-file');
            shell.openPath(file);
        });
    });
}

function updateNoteTemplatesList() {
    console.log("updating notes template list");

    ipcRenderer.invoke('get-app-data-path').then((appDataPath) => {
        var templatesDir = path.join(appDataPath, 'templates');

        if (!fs.existsSync(templatesDir)) {
            fs.mkdirSync(templatesDir);
        }

        fs.writeFileSync(path.join(templatesDir, 'Blank Markdown.md'), '');

        // fs.writeFile(path.join(templatesDir, 'Blank Markdown.md'), '', function (err) {
        //     if (err) console.log("ERROR: " + err);
        // });

        fs.readdir(templatesDir, (err, files) => {
            var htmlStr = "";
            if (err != null) {
                htmlStr = `An error occurred while searching the templates directory. Please confirm that the following directory exists on your computer: <code>${templatesDir}</code>`
            } else {
                files.forEach(file => {
                    var isNote = false;
                    var iconName = undefined;

                    if (file.endsWith(".md") || file.endsWith(".txt")) {
                        // text file, this is a template
                        isNote = true;
                        iconName = "notes";
                    }

                    if (isNote) {
                        var fullFilePath = path.join(templatesDir, file);
                        htmlStr += `<a href="#" class="note-template-link" data-file="${fullFilePath}"><div style="flex-grow: 1">${file}</div><i class="material-icons" style="font-size: 36px; margin: 0; padding: 0;">${iconName}</i></a>`
                    }
                });
            }

            if (htmlStr === "") {
                htmlStr = "No templates available."
            }

            $('#note-template-list').html(htmlStr);

            $('.note-template-link').bind('click', function (event) {
                console.log("template clicked clicked");
                event.preventDefault();

                var newNoteName = $('#new-note-name').val();
                if (newNoteName === "") {
                    $('#new-note-error').text("Please enter a note name")
                    return;
                }

                var currTemplate = this.getAttribute('data-file');
                console.log("current template: " + currTemplate);

                var templateContents = fs.readFileSync(currTemplate, 'utf8');

                console.log(templateContents)

                templateContents = templateContents.replace('{note_name}', newNoteName);
                templateContents = templateContents.replace('{course_number}', currentCourseNumber);
                templateContents = templateContents.replace('{course_name}', currentCourse.name);
                templateContents = templateContents.replace('{date}', new Date().toLocaleDateString());

                if (currTemplate.endsWith(".md")) newNoteName += ".md";
                else if (currTemplate.endsWith(".txt")) newNoteName += ".txt";

                console.log("new note name: " + newNoteName);

                var notesDir = currentCourse.notes_folder;
                var filePath = path.join(notesDir, newNoteName)

                console.log("file path: " + filePath)
                fs.writeFileSync(filePath, templateContents)
                console.log("opening " + filePath)
                shell.openPath(filePath);

                $('#new-note-modal').modal('hide');
                updateNotesList()
            });
        });
    });

}

function updateSidebarCourseList(courseToLoad) {
    console.log("updating sidebar course list");
    var htmlStr = "";
    // <a href="#" data-course-number="cs106b" class="sidebar-list-item list-group-item list-group-item-action">CS 106B</a>
    dataStore.get('courses', (courses) => {
        for (var c of Object.keys(courses)) {
            htmlStr += `<a href="#" data-course-number="${c}" class="sidebar-list-item sidebar-class list-group-item list-group-item-action">${c}</a>`
        }
        htmlStr += `<a href="#" class="sidebar-list-item list-group-item list-group-item-action" id="new-class">New Course</a>`

        $('#sidebar-list').html(htmlStr);

        $('.sidebar-class').bind('click', function (event) {
            console.log("clicked");
            event.preventDefault();
            switchCourse(this.getAttribute('data-course-number'))
        });

        $('#new-class').bind('click', function (event) {
            console.log("new class clicked");
            event.preventDefault();
            $('#new-course-modal').modal('show');
        });

        switchCourse(courseToLoad);
    });
}

$(document).ready(function () {

    dataStore.get('lastSelectedCourse', (lsc) => {
        console.log("=====LSC=====: " + lsc);
        updateSidebarCourseList(lsc);
    });

    $('#new-course-modal').on('show.bs.modal', function (event) {
        $('#new-course-course-name').val("");
        $('#new-course-course-number').val("");
        $('#new-course-meeting-link').val("");
        $('#new-course-notes-path-label').text("");

        $('#new-course-error').text("");
    });

    $('#new-course-save-button').on('click', function (event) {
        var name = $('#new-course-course-name').val();
        var number = $('#new-course-course-number').val();
        var meetingLink = $('#new-course-meeting-link').val();
        var notesFolder = $('#new-course-notes-path-label').text();

        if (name !== "" && number !== "" && meetingLink !== "" && notesFolder !== "") {
            dataStore.has('courses.' + number, (has) => {
                if (!has) {
                    var newCourseData = {
                        name: name,
                        meeting_link: meetingLink,
                        notes_folder: notesFolder
                    };

                    dataStore.set('courses.' + number, newCourseData);
                    updateSidebarCourseList(number);

                    $('#new-course-modal').modal('hide');
                } else {
                    $('#new-course-error').text("Course number already exists")
                }
            });

        } else {
            $('#new-course-error').text("Please fill out all fields")
        }
    });

    $('#new-course-select-notes-dir-button').bind('click', function (event) {
        console.log("select notes dir button clicked");
        event.preventDefault();
        ipcRenderer.invoke('open-folder-picker').then((result) => {
            console.log(result);
            $('#new-course-notes-path-label').text(result);
        });
    });

    $('#meeting-button').bind('click', function (event) {
        console.log("meeting button clicked");
        if (currentCourse === undefined) {
            return;
        }
        event.preventDefault();
        var link = this.getAttribute('data-link');
        shell.openExternal(link)
    });

    $('#settings').bind('click', function (event) {
        console.log("settings clicked");
        if (currentCourse === undefined) {
            console.log("current course undefined")
            return;
        }

        $('#course-settings-error').text("")
        $('#course-settings').modal('show');
    })

    $('#course-settings').on('show.bs.modal', function (event) {
        $('#course-settings-course-name').val(currentCourse.name);
        $('#course-settings-course-number').val(currentCourseNumber);
        $('#course-settings-meeting-link').val(currentCourse.meeting_link);
        $('#course-settings-notes-path-label').text(currentCourse.notes_folder);

        $('#confirm-delete-buttons').css('display', 'none');
    });

    $('#course-settings-save-button').on('click', function (event) {
        var name = $('#course-settings-course-name').val();
        var number = $('#course-settings-course-number').val();
        var meetingLink = $('#course-settings-meeting-link').val();
        var notesFolder = $('#course-settings-notes-path-label').text();

        if (name !== "" && number !== "" && meetingLink !== "" && notesFolder !== "") {
            dataStore.get('courses.' + currentCourseNumber + '.todos', (todos) => {
                dataStore.get('courses.' + currentCourseNumber + '.tests', (tests) => {
                    var newCourseData = {
                        name: name,
                        meeting_link: meetingLink,
                        notes_folder: notesFolder,
                        todos: todos,
                        tests: tests
                    };

                    // var id = number.toLowerCase().replace(' ', '');
                    dataStore.set('courses.' + number, newCourseData);
                    if (currentCourseNumber !== number) {
                        dataStore.delete('courses.' + currentCourseNumber);
                    }
                    updateSidebarCourseList(number);

                    $('#course-settings').modal('hide');
                });
            });

        } else {
            $('#course-settings-error').text("Please fill out all fields");
        }
    });

    $('#course-settings-delete-button').on('click', function (event) {
        $('#confirm-delete-buttons').css('display', 'flex');
    });

    $('#course-settings-do-not-delete-button').on('click', function (event) {
        $('#confirm-delete-buttons').css('display', 'none');
    });

    $('#course-settings-confirm-delete-button').on('click', function (event) {
        dataStore.delete('courses.' + currentCourseNumber);
        dataStore.get('lastSelectedCourse', (lsc) => {
            $('#course-settings').modal('hide');
            currentCourse = undefined;
            currentCourseNumber = undefined;
            updateSidebarCourseList(undefined);
        });
    });

    $('#select-notes-dir-button').bind('click', function (event) {
        console.log("select notes dir button clicked");
        event.preventDefault();
        ipcRenderer.invoke('open-folder-picker').then((result) => {
            console.log(result);
            $('#course-settings-notes-path-label').text(result);
        });
    });

    $('#new-note').bind('click', function (event) {
        console.log("add note clicked");
        if (currentCourse === undefined) {
            return;
        }

        updateNoteTemplatesList();

        $('#new-note-error').text("")
        $('#new-note-name').val("");

        $('#new-note-modal').modal('show');
    });

    $('#create-new-template-link').bind('click', (event) => {
        $('#new-note-modal').modal('hide');

        $('#new-template-error').text("");
        $('#new-template-name').val("");

        $('#new-template-modal').modal('show');
    });

    $('#new-template-create-button').bind('click', (event) => {
        const templateName = $('#new-template-name').val();
        if (templateName !== "") {
            if (templateName.endsWith('.md') || templateName.endsWith('.txt')) {
                ipcRenderer.invoke('get-app-data-path').then((appDataPath) => {
                    const templatesDir = path.join(appDataPath, 'templates');

                    if (!fs.existsSync(templatesDir)) {
                        fs.mkdirSync(templatesDir);
                    }

                    const filePath = path.join(templatesDir, templateName);

                    console.log("file path: " + filePath);
                    fs.writeFileSync(filePath, "");
                    console.log("opening " + filePath);
                    shell.openPath(filePath);

                    $('#new-template-modal').modal('hide');
                });
            } else {
                $('#new-template-error').text("File name must end in .md or .txt")
            }
        } else {
            $('#new-template-error').text("Please enter a template name")
        }
    });

    $('#new-todo').bind('click', (event) => {
        console.log("new todo button clicked");
        $('#todo-input-name').val("");
        $('#todo-input-date').val("");
        $('#new-todo-container').css('display', 'block');
    });

    $('#new-todo-close').bind('click', (event) => {
        console.log("new todo close clicked");
        $('#new-todo-container').css('display', 'none');
    });

    $('#todo-add').bind('click', (event) => {
        console.log("todo add clicked");
        const todoText = $('#todo-input-name').val();
        const dateText = $('#todo-input-date').val();

        if (todoText !== "") {
            const id = Date.now();
            const todo = {
                text: todoText,
                date: dateText,
                // id: id
            }

            dataStore.set('courses.' + currentCourseNumber + '.todos.' + id, todo);
            updateTodoList();

            $('#new-todo-container').css('display', 'none');
        }

    });



    $('#new-test').bind('click', (event) => {
        console.log("new test button clicked");
        $('#test-input-name').val("");
        $('#test-input-date').val("");
        $('#new-test-container').css('display', 'block');
    });

    $('#new-test-close').bind('click', (event) => {
        console.log("new test close clicked");
        $('#new-test-container').css('display', 'none');
    });

    $('#test-add').bind('click', (event) => {
        console.log("test add clicked");
        const testText = $('#test-input-name').val();
        const dateText = $('#test-input-date').val();

        if (testText !== "") {
            const id = Date.now();
            const test = {
                text: testText,
                date: dateText,
                // id: id
            }

            dataStore.set('courses.' + currentCourseNumber + '.tests.' + id, test);
            updateTestList();

            $('#new-test-container').css('display', 'none');
        }

    });


});

console.log("loaded")