# ============================================
# SECRETS DIRECTORY
# ============================================
# This directory contains sensitive production secrets.
# 
# SETUP INSTRUCTIONS:
# 1. Copy all .example files and remove .example extension:
#    cp db_password.txt.example db_password.txt
#    cp jwt_access_secret.txt.example jwt_access_secret.txt
#    cp jwt_refresh_secret.txt.example jwt_refresh_secret.txt
#    cp cloudinary_api_secret.txt.example cloudinary_api_secret.txt
#    cp email_password.txt.example email_password.txt
#
# 2. Update each file with your ACTUAL production secrets
#
# 3. Set proper file permissions (Linux/Mac):
#    chmod 600 *.txt
#
# SECURITY:
# - .txt files are in .gitignore (will NOT be committed)
# - .example files are safe templates (can be committed)
# - Docker secrets will mount these files into containers
#
# NEVER commit actual secret files (.txt) to git!
