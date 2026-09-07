/** Lời chú thích lịch thanh toán theo vai trò — không dùng giọng người dân cho chủ đầu tư. */

export function isHousingDeveloperRole(role?: string | null): boolean {
  return role === 'Housing Developer'
}

export function isConstructionDeptRole(role?: string | null): boolean {
  return role === 'Department Of Construction' || role === 'SXD Staff'
}

function isStaffRole(role?: string | null): boolean {
  return isHousingDeveloperRole(role) || isConstructionDeptRole(role) || role === 'System Administrator'
}

/** Chưa có lịch vì chưa gán căn. */
export function emptyScheduleNoApartmentCopy(role?: string | null): { title: string; body: string } {
  if (isHousingDeveloperRole(role)) {
    return {
      title: 'Chưa có lịch thanh toán',
      body: 'Hồ sơ này chưa được gán căn nên hệ thống chưa sinh lịch. Hãy gán căn hộ cho hồ sơ; lịch sẽ được tạo theo cấu hình tiến độ bạn đã khai khi tạo dự án. Người dân đóng Đợt 1 (thanh toán lần đầu, gồm tiền đặt cọc) trước, rồi mới ký hợp đồng mua bán.',
    }
  }
  if (isStaffRole(role)) {
    return {
      title: 'Chưa có lịch thanh toán',
      body: 'Lịch được tạo sau khi chủ đầu tư gán căn hộ cho hồ sơ, theo cấu hình tiến độ của dự án. Người dân đóng Đợt 1 (thanh toán lần đầu, gồm tiền đặt cọc) trước khi ký hợp đồng mua bán.',
    }
  }
  return {
    title: 'Chưa có lịch thanh toán',
    body: 'Hệ thống sẽ tạo lịch theo cấu hình của chủ đầu tư sau khi chủ đầu tư gán căn hộ cho bạn. Bạn đóng Đợt 1 (thanh toán lần đầu, gồm tiền đặt cọc) trước, rồi mới ký hợp đồng mua bán.',
  }
}

/** Đã có căn / đã ký nhưng chưa sinh đợt. */
export function emptyScheduleHasApartmentCopy(role?: string | null): { title: string; body: string } {
  if (isHousingDeveloperRole(role)) {
    return {
      title: 'Hồ sơ đã có căn nhưng chưa có lịch thanh toán',
      body: 'Hệ thống chưa sinh các đợt theo cấu hình dự án. Kiểm tra tiến độ thanh toán bạn đã khai, rồi tải lại trang. Nếu vẫn trống, tạo hoặc chỉnh đợt trên dự án rồi thử lại.',
    }
  }
  if (isStaffRole(role)) {
    return {
      title: 'Hồ sơ đã có căn nhưng chưa có lịch thanh toán',
      body: 'Chủ đầu tư cần kiểm tra cấu hình đợt thanh toán của dự án và tạo lại lịch cho hồ sơ này.',
    }
  }
  return {
    title: 'Hợp đồng hoặc căn đã có nhưng hệ thống chưa sinh lịch thanh toán',
    body: 'Vui lòng liên hệ chủ đầu tư hoặc ban quản lý dự án để được tạo lịch theo cấu hình dự án.',
  }
}

export function scheduleLoadErrorCopy(role?: string | null): { title: string; body: string } {
  if (isHousingDeveloperRole(role)) {
    return {
      title: 'Chưa tải được lịch thanh toán',
      body: 'Hồ sơ có thể chưa được sinh đợt, hoặc máy chủ đang gặp sự cố. Kiểm tra cấu hình tiến độ dự án rồi tải lại.',
    }
  }
  if (isStaffRole(role)) {
    return {
      title: 'Chưa tải được lịch thanh toán',
      body: 'Hồ sơ có thể chưa được sinh đợt. Chủ đầu tư cần kiểm tra cấu hình tiến độ dự án hoặc thử lại sau.',
    }
  }
  return {
    title: 'Chưa tải được lịch thanh toán',
    body: 'Hồ sơ có thể chưa được tạo đợt thanh toán. Liên hệ chủ đầu tư hoặc thử lại sau.',
  }
}

export function scheduleMismatchHint(role?: string | null): string {
  if (isHousingDeveloperRole(role)) {
    return 'Đối soát lại tỷ lệ các đợt và giá căn trên cấu hình dự án.'
  }
  if (isStaffRole(role)) {
    return 'Chủ đầu tư cần đối soát tỷ lệ các đợt với giá căn trên dự án.'
  }
  return 'Vui lòng báo chủ đầu tư hoặc ban quản lý dự án để đối soát.'
}

export function payScheduleMissingError(role?: string | null): string {
  if (isHousingDeveloperRole(role)) {
    return 'Hệ thống chưa tạo lịch thanh toán cho hồ sơ này. Kiểm tra cấu hình đợt của dự án hoặc tải lại.'
  }
  return 'Hệ thống chưa tạo lịch thanh toán. Liên hệ chủ đầu tư hoặc thử lại sau.'
}

export function payStatusNotReadyError(role?: string | null): string {
  if (isHousingDeveloperRole(role)) {
    return 'Hồ sơ chưa ở trạng thái cho phép thanh toán. Kiểm tra đã gán căn và người dân đã đóng Đợt 1 chưa.'
  }
  return 'Hồ sơ chưa ở trạng thái cho phép thanh toán. Kiểm tra: đã được chủ đầu tư gán căn và đã đóng Đợt 1 chưa.'
}
