'use client';
import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';

export default function AvisoDePrivacidadPage() {
    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8faf5 0%, #eef2e6 100%)' }}>
            {/* Header */}
            <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 24px' }}>
                <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6a9a04', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
                        <ArrowLeft size={18} /> Volver al inicio
                    </Link>
                </div>
            </div>

            {/* Content */}
            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 24px' }}>
                <div style={{ background: 'white', borderRadius: '20px', padding: '48px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    {/* Title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(106,154,4,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Shield size={28} style={{ color: '#6a9a04' }} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', margin: 0 }}>Aviso de Privacidad</h1>
                            <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0' }}>GreenLand Products S.A. de C.V.</p>
                        </div>
                    </div>

                    <div style={{ fontSize: '15px', lineHeight: '1.8', color: '#334155' }}>
                        <p>En cumplimiento con lo establecido por la Ley Federal de Protección de Datos Personales en Posesión de los Particulares, GreenLand Products S.A. de C.V. (en adelante &quot;GreenLand&quot;), con domicilio en:</p>

                        <p style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '12px', borderLeft: '4px solid #6a9a04', fontWeight: '500' }}>
                            BLVD. Vito Alessio Robles No. Ext. 3550 No. Int. 9, Col. Nazario S. Ortiz Garza, C.P. 25100, Saltillo, Coahuila de Zaragoza, México,
                        </p>

                        <p>pone a disposición de sus clientes, distribuidores, proveedores y usuarios del Portal de Distribuidores GreenLand el presente Aviso de Privacidad, con la finalidad de informar sobre el tratamiento que se dará a los datos personales que se recaben.</p>

                        {/* Section 1 */}
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '36px', paddingBottom: '10px', borderBottom: '2px solid #f1f5f9' }}>1. Datos personales que se recaban</h2>

                        <p>Para el registro y uso del Portal de Distribuidores GreenLand, así como para la formalización de relaciones comerciales, GreenLand podrá recabar los siguientes datos personales:</p>

                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginTop: '20px' }}>Datos de identificación y contacto</h3>
                        <ul style={{ paddingLeft: '24px' }}>
                            <li>Nombre completo</li>
                            <li>Nombre de la empresa</li>
                            <li>Número telefónico</li>
                            <li>Correo electrónico</li>
                            <li>Registro Federal de Contribuyentes (RFC)</li>
                            <li>Régimen fiscal</li>
                        </ul>

                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginTop: '20px' }}>Datos fiscales y comerciales</h3>
                        <ul style={{ paddingLeft: '24px' }}>
                            <li>Dirección fiscal</li>
                            <li>Dirección de envío</li>
                            <li>Constancia de situación fiscal</li>
                            <li>Acta constitutiva (en caso de personas morales)</li>
                            <li>Poderes de representación legal</li>
                            <li>Identificación oficial</li>
                            <li>Comprobante de domicilio</li>
                        </ul>

                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginTop: '20px' }}>Información operativa y comercial generada en la plataforma</h3>
                        <p>A través del uso del portal podrán generarse y almacenarse registros relacionados con:</p>
                        <ul style={{ paddingLeft: '24px' }}>
                            <li>Historial de pedidos</li>
                            <li>Historial de compras</li>
                            <li>Historial de pagos</li>
                            <li>Inventarios registrados por el usuario</li>
                            <li>Registro de ventas</li>
                            <li>Movimientos de pedidos</li>
                            <li>Evidencias de entrega o envío</li>
                            <li>Información relacionada con la operación comercial entre GreenLand y el distribuidor.</li>
                        </ul>

                        {/* Section 2 */}
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '36px', paddingBottom: '10px', borderBottom: '2px solid #f1f5f9' }}>2. Finalidades del tratamiento de datos</h2>

                        <p>Los datos personales recabados serán utilizados para las siguientes finalidades:</p>

                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginTop: '20px' }}>Finalidades primarias</h3>
                        <ul style={{ paddingLeft: '24px' }}>
                            <li>Identificar y verificar a los distribuidores o clientes.</li>
                            <li>Formalizar relaciones comerciales entre GreenLand y sus distribuidores.</li>
                            <li>Administrar el acceso y uso del Portal de Distribuidores GreenLand.</li>
                            <li>Gestionar pedidos, envíos, entregas y operaciones comerciales.</li>
                            <li>Administrar pagos, saldos y movimientos financieros derivados de operaciones comerciales.</li>
                            <li>Llevar control operativo de inventarios y movimientos comerciales registrados por los distribuidores.</li>
                            <li>Cumplir con obligaciones fiscales, contables y comerciales.</li>
                            <li>Acreditar la materialidad de operaciones comerciales y de comercio exterior.</li>
                            <li>Cumplir con requerimientos de autoridades fiscales o regulatorias.</li>
                        </ul>

                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginTop: '20px' }}>Finalidades secundarias</h3>
                        <ul style={{ paddingLeft: '24px' }}>
                            <li>Mejorar la operación y funcionalidad de la plataforma.</li>
                            <li>Realizar análisis estadísticos sobre la operación comercial.</li>
                            <li>Comunicación con distribuidores sobre pedidos, pagos o información relevante de la relación comercial.</li>
                        </ul>

                        {/* Section 3 */}
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '36px', paddingBottom: '10px', borderBottom: '2px solid #f1f5f9' }}>3. Transferencia de datos personales</h2>

                        <p>GreenLand podrá compartir ciertos datos personales en los siguientes casos:</p>

                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginTop: '20px' }}>Proveedores logísticos o de transporte</h3>
                        <p>Se podrá compartir únicamente la información necesaria para la entrega de mercancías, principalmente:</p>
                        <ul style={{ paddingLeft: '24px' }}>
                            <li>Nombre</li>
                            <li>Dirección de envío</li>
                            <li>Datos de contacto</li>
                        </ul>

                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginTop: '20px' }}>Proveedores tecnológicos</h3>
                        <p>Algunos datos pueden ser procesados mediante servicios tecnológicos utilizados para la operación del portal, tales como:</p>
                        <ul style={{ paddingLeft: '24px' }}>
                            <li><strong>Supabase</strong>, utilizado para el almacenamiento y gestión de bases de datos.</li>
                            <li><strong>Resend</strong>, utilizado para el envío automatizado de notificaciones y correos electrónicos relacionados con la operación de la plataforma.</li>
                        </ul>
                        <p>Estos proveedores operan bajo estándares de seguridad adecuados para el manejo de información.</p>

                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginTop: '20px' }}>Autoridades</h3>
                        <p>GreenLand podrá proporcionar información a autoridades fiscales, administrativas o judiciales cuando así lo requieran conforme a la legislación aplicable.</p>

                        {/* Section 4 */}
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '36px', paddingBottom: '10px', borderBottom: '2px solid #f1f5f9' }}>4. Derechos ARCO</h2>

                        <p>El titular de los datos personales tiene derecho a ejercer en cualquier momento los derechos de:</p>
                        <ul style={{ paddingLeft: '24px' }}>
                            <li><strong>Acceso</strong></li>
                            <li><strong>Rectificación</strong></li>
                            <li><strong>Cancelación</strong></li>
                            <li><strong>Oposición</strong></li>
                        </ul>
                        <p>respecto al tratamiento de sus datos personales.</p>

                        <p>Para ejercer estos derechos, el titular deberá enviar una solicitud al correo electrónico:</p>
                        <p style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '12px', borderLeft: '4px solid #6a9a04', fontWeight: '600' }}>
                            📧 alain.ramos@greenland-products.com.mx
                        </p>
                        <p>indicando:</p>
                        <ul style={{ paddingLeft: '24px' }}>
                            <li>Nombre del titular</li>
                            <li>Derecho que desea ejercer</li>
                            <li>Información o datos sobre los que solicita la acción</li>
                        </ul>
                        <p>GreenLand dará respuesta en los plazos establecidos por la legislación aplicable.</p>

                        {/* Section 5 */}
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '36px', paddingBottom: '10px', borderBottom: '2px solid #f1f5f9' }}>5. Medidas de seguridad</h2>
                        <p>GreenLand implementa medidas administrativas, técnicas y físicas para proteger los datos personales contra daño, pérdida, alteración, destrucción o uso no autorizado.</p>
                        <p>Asimismo, el acceso al Portal de Distribuidores GreenLand se encuentra restringido mediante credenciales de usuario y controles de autenticación.</p>

                        {/* Section 6 */}
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '36px', paddingBottom: '10px', borderBottom: '2px solid #f1f5f9' }}>6. Uso de cookies y tecnologías similares</h2>
                        <p>El portal podrá utilizar cookies o tecnologías similares para mejorar la experiencia de navegación, mantener sesiones activas y facilitar el funcionamiento de la plataforma.</p>
                        <p>Estas tecnologías no recopilan información personal sensible y se utilizan únicamente para fines técnicos y operativos.</p>

                        {/* Section 7 */}
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '36px', paddingBottom: '10px', borderBottom: '2px solid #f1f5f9' }}>7. Cambios al aviso de privacidad</h2>
                        <p>GreenLand se reserva el derecho de modificar o actualizar el presente Aviso de Privacidad en cualquier momento.</p>
                        <p>Cualquier cambio será publicado en:</p>
                        <p style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '12px', borderLeft: '4px solid #6a9a04', fontWeight: '500' }}>
                            www.greenland-products.com.mx y dentro del Portal de Distribuidores GreenLand.
                        </p>

                        {/* Section 8 */}
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '36px', paddingBottom: '10px', borderBottom: '2px solid #f1f5f9' }}>8. Consentimiento</h2>
                        <p>Al registrarse o utilizar el Portal de Distribuidores GreenLand, el usuario manifiesta haber leído y aceptado los términos del presente Aviso de Privacidad.</p>

                        <p style={{ marginTop: '40px', fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Última actualización: Marzo 2026.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
