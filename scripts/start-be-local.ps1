# Khởi động BE KHÔNG sửa appsettings — override connection string qua biến môi trường
# SQL Server local: localhost\SQLEXPRESS, DB: RHS_Database, Windows Auth

$BeRoot = "C:\Users\Admin\Downloads\SEP490_Resilience_Housing_Supply_Backend-main"
$ApiProject = Join-Path $BeRoot "RHS.API\RHS.API.csproj"

if (-not (Test-Path $ApiProject)) {
  Write-Error "Không tìm thấy BE tại: $ApiProject"
  exit 1
}

# Ghi đè connection string (ASP.NET Core đọc env trước appsettings.json)
$env:ConnectionStrings__DefaultConnection = @"
Server=localhost\SQLEXPRESS;Database=RHS_Database;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true;Encrypt=False
"@.Trim()

Write-Host "Connection (env override): localhost\SQLEXPRESS / RHS_Database / Windows Auth"
Write-Host "Dừng RHS.API cũ (nếu có)..."
Stop-Process -Name "RHS.API" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Write-Host "Chạy BE (profile https → :7085)..."
Set-Location (Join-Path $BeRoot "RHS.API")
dotnet run --project $ApiProject --launch-profile https
