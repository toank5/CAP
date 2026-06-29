import { useMemo } from 'react'
import { FormField } from '@/components/ui/label'
import { Input, Select } from '@/components/ui/input'
import { getDistrictsByProvince, VIETNAM_PROVINCES } from '@/lib/vietnam-locations'

interface LocationFieldsProps {
  province: string
  district: string
  onProvinceChange: (value: string) => void
  onDistrictChange: (value: string) => void
  addressDefaultValue?: string
  addressKey?: string
}

export function LocationFields({
  province,
  district,
  onProvinceChange,
  onDistrictChange,
  addressDefaultValue,
  addressKey,
}: LocationFieldsProps) {
  const districts = useMemo(() => getDistrictsByProvince(province), [province])
  const districtOptions = useMemo(() => {
    if (district && !districts.includes(district)) return [district, ...districts]
    return districts
  }, [district, districts])

  return (
    <>
      <FormField label="Tỉnh/Thành" htmlFor="province">
        <Select
          id="province"
          name="province"
          required
          value={province}
          onChange={(e) => {
            onProvinceChange(e.target.value)
            onDistrictChange('')
          }}
        >
          <option value="">Chọn tỉnh/thành phố</option>
          {VIETNAM_PROVINCES.map((p) => (
            <option key={p.code} value={p.name}>{p.name}</option>
          ))}
        </Select>
      </FormField>

      <FormField label="Quận/Huyện" htmlFor="district">
        <Select
          id="district"
          name="district"
          required
          value={district}
          disabled={!province}
          onChange={(e) => onDistrictChange(e.target.value)}
        >
          <option value="">{province ? 'Chọn quận/huyện' : 'Chọn tỉnh/thành trước'}</option>
          {districtOptions.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </Select>
      </FormField>

      <FormField label="Địa chỉ cụ thể" htmlFor="address">
        <Input
          id="address"
          name="address"
          required
          key={addressKey}
          defaultValue={addressDefaultValue}
          placeholder="Số nhà, tên đường, phường/xã..."
        />
      </FormField>
    </>
  )
}
