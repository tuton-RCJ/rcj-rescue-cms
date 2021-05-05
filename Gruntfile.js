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
                dest: 'public/js'
                }]
            }
        },
        cssmin: {
            target: {
              files: [{
                expand: true,
                cwd: 'public/stylesheets',
                src: '**/*.css',
                dest: 'public/css'
              }]
            }
          },
          imagemin: {
            dynamic: {
                files: [{
                    expand: true,
                    cwd: 'public/images/',
                    src: ['**/*.{png,jpg,gif}'],
                    dest: 'public/images'
                }]
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-imagemin');
    grunt.registerTask('default', ['uglify', 'cssmin', 'imagemin']);
}