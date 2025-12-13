#!/bin/sh
# SQL Server health check script
# Reads password from Docker secret and tests connection

set -e

# Read password from secret file
SA_PASSWORD=$(cat /run/secrets/db_password)

# Execute health check query
/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$SA_PASSWORD" -C -Q 'SELECT 1' > /dev/null

echo "SQL Server is healthy"
