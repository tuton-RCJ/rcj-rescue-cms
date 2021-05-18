module.exports = function(grunt){

    grunt.initConfig({
        uglify: {
            options: {
                compress: {
                    drop_console: true
                }
            },
            target: {
                files: [{
                expand: true,
                cwd: 'public/javascripts',
                src: '**/*.js',
                dest: 'public/javascripts'
                }]
            }
        },
        cssmin: {
            target: {
              files: [{
                expand: true,
                cwd: 'public/stylesheets',
                src: '**/*.css',
                dest: 'public/stylesheets'
              }]
            }
        },
        json_minification: {
            target: {
              files: [{
                expand: true,
                cwd: 'public/lang',
                src: ['*.json'],
                dest: 'public/lang'
              }]
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-json-minification');
    grunt.registerTask('default', ['uglify', 'cssmin', 'json_minification']);
}